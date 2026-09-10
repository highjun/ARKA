import path from "node:path";
import { deleteAccessApp, deleteDnsRecords, resolveZoneId } from "./cloudflare.ts";
import { deleteTunnel, findTunnelByName } from "./cloudflared.ts";
import { acquire, release } from "./lock.ts";
import { Manifest } from "./spec.ts";
import type { Ports } from "./ports.ts";

/**
 * 배포를 **내린다.** 무엇을 지울지는 옵션이 정하고, **무엇이 있는지는 manifest가 안다.**
 *
 * 이미지 이름을 `<이름>:latest`로 추측하지 않는다 — 그렇게 하다 엉뚱한 것을 지운 전례가 있다.
 */
export interface DownOptions {
  /** 컨테이너를 지운다. 이것만 기본으로 켜져 있다. */
  readonly containers: boolean;
  readonly tunnel: boolean;
  readonly dns: boolean;
  readonly image: boolean;
  readonly state: boolean;
  /**
   * Access 앱을 지운다. **기본은 끔** — DNS와 반대 판단이다.
   *
   * 남겨 두면 다음 배포의 `ensureAccessApp`이 덮어쓴다. 그런데 지우는 순간 그 호스트 이름은
   * 다시 배포될 때까지 **무방비**다. 남기는 쪽이 안전하다.
   */
  readonly access: boolean;
}

/** `--purge`가 켜는 것들. `access`는 위 이유로 여기 없다. */
export const PURGE: DownOptions = { containers: true, tunnel: true, dns: true, image: true, state: true, access: false };

/** 기본 — 컨테이너만 내린다. */
export const DEFAULT: DownOptions = { containers: true, tunnel: false, dns: false, image: false, state: false, access: false };

/** 어느 배포를, 어디의 상태를 보고 내릴 것인가. */
export interface DownInput {
  readonly name: string;
  readonly stateDir: string;
  readonly credentialsDir: string;
  readonly zone: string;
  readonly token: string;
  /** manifest가 없을 때 대신 쓸 호스트 이름. DNS·Access를 지우려면 둘 중 하나는 있어야 한다. */
  readonly hostname?: string;
}

/** 무엇을 실제로 지웠는지. 로그가 아니라 값으로 돌려준다 — 테스트가 이것을 본다. */
export interface DownResult {
  readonly containersRemoved: boolean;
  readonly tunnelRemoved: boolean;
  readonly dnsRecordsRemoved: number;
  readonly imageRemoved: boolean;
  readonly accessRemoved: boolean;
  readonly stateRemoved: boolean;
}

const readManifest = (dir: string, ports: Ports): Manifest | undefined => {
  const file = path.join(dir, "manifest.json");
  if (!ports.fs.exists(file)) return undefined;
  const parsed = Manifest.safeParse(JSON.parse(ports.fs.readFile(file)));
  return parsed.success ? parsed.data : undefined;
};

/**
 * 컨테이너를 내린다. compose 파일이 있으면 그것으로, **없으면 이름으로 직접** 지운다.
 *
 * 폴백이 필요한 이유는 옛 경로가 깨져 compose를 못 찾는 상태가 실제로 생기기 때문이다 —
 * 그때가 바로 내려야 하는 순간인데 정상 경로가 막혀 있다.
 */
const removeContainers = async (name: string, dir: string, ports: Ports): Promise<void> => {
  const composeFile = path.join(dir, "compose.yml");
  if (ports.fs.exists(composeFile)) {
    await ports.exec("docker", ["compose", "-p", name, "-f", composeFile, "down", "--remove-orphans"]);
    return;
  }
  ports.log(`compose 파일이 없어 컨테이너를 이름으로 지웁니다`);
  await ports.exec("docker", ["rm", "-f", `${name}-app`, `${name}-tunnel`]);
};

/** 배포를 내린다. 지운 것을 값으로 돌려준다. */
export const down = async (input: DownInput, options: DownOptions, ports: Ports): Promise<DownResult> => {
  const dir = path.join(input.stateDir, input.name);
  const manifest = readManifest(dir, ports);
  const hostname = input.hostname ?? manifest?.hostname;
  const lockDir = path.join(input.stateDir, ".locks");
  const key = `tunnel-${input.name}`;

  if ((options.dns || options.access) && hostname === undefined) {
    throw new Error(`호스트 이름을 모릅니다 — manifest도 인자도 없어 DNS·Access를 지울 수 없습니다`);
  }

  acquire(lockDir, key);
  try {
    const result = { containersRemoved: false, tunnelRemoved: false, dnsRecordsRemoved: 0, imageRemoved: false, accessRemoved: false, stateRemoved: false };
    if (ports.dryRun) {
      ports.log(`[dry-run] ${input.name}에서 ${Object.entries(options).filter(([, on]) => on).map(([k]) => k).join(", ")}를 지울 것`);
      return result;
    }

    if (options.containers) {
      await removeContainers(input.name, dir, ports);
      result.containersRemoved = true;
    }

    if (options.image) {
      if (manifest === undefined) {
        ports.log(`manifest가 없어 이미지를 건너뜁니다 — 이름을 추측하지 않습니다`);
      } else {
        await ports.exec("docker", ["image", "rm", "-f", manifest.image]);
        result.imageRemoved = true;
      }
    }

    if (options.tunnel) {
      const tunnel = await findTunnelByName(ports.exec, input.name);
      if (tunnel === undefined) {
        ports.log(`터널 ${input.name}이 이미 없습니다`);
      } else {
        await deleteTunnel(ports.exec, tunnel.id);
        ports.fs.rm(path.join(input.credentialsDir, `${tunnel.id}.json`));
        result.tunnelRemoved = true;
      }
    }

    // 존 조회는 **한 번만** 한다. DNS와 Access를 같이 켜도 요청이 하나다.
    if ((options.dns || options.access) && hostname !== undefined) {
      const zoneId = await resolveZoneId(ports.fetch, input.token, input.zone);
      if (options.dns) result.dnsRecordsRemoved = await deleteDnsRecords(ports.fetch, input.token, zoneId, hostname);
      if (options.access) result.accessRemoved = await deleteAccessApp(ports.fetch, input.token, zoneId, hostname);
    }

    if (options.state) {
      for (const file of ["compose.yml", "cloudflared.yml", "manifest.json"]) ports.fs.rm(path.join(dir, file));
      result.stateRemoved = true;
    }

    ports.log(`${input.name} 내렸습니다`);
    return result;
  } finally {
    release(lockDir, key);
  }
};
