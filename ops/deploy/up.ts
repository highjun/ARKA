import path from "node:path";
import { ensureAccessApp, resolveZoneId } from "./cloudflare.ts";
import { createTunnel, findTunnelByName, routeDns } from "./cloudflared.ts";
import { findGhostMounts } from "./ghostMount.ts";
import { acquire, release } from "./lock.ts";
import { renderCloudflared, renderCompose } from "./render.ts";
import type { DeploySpec, Manifest } from "./spec.ts";
import type { Inspected } from "./ghostMount.ts";
import type { Ports } from "./ports.ts";

/**
 * 배포를 **올린다.** 두 번 돌려도 같은 결과여야 한다 — "만든다"가 아니라 "이 상태를 보장한다"다.
 *
 * **롤백하지 않는다.** 대신 되돌리기 어려운 단계에 닿기 전에 선다 — 자격증명 덮어쓰기 거부,
 * DNS 자동 덮어쓰기 거부, 유령 마운트 사전 검사. 보상 트랜잭션을 흉내내면 반쯤 지워진
 * 상태가 생기는데, 그게 아무것도 안 한 것보다 나쁘다.
 */
export interface UpInput {
  readonly spec: DeploySpec;
  /** 이 배포가 어느 스펙에서 나왔는지. 생성물 머리와 manifest에 박힌다. */
  readonly sourceFile: string;
  /** 생성물이 사는 곳. 저장소가 아니다 — 기계가 만든 YAML을 커밋하지 않는다. */
  readonly stateDir: string;
  /** 터널 자격증명 디렉터리. `0700`이어야 한다. */
  readonly credentialsDir: string;
  readonly zone: string;
  readonly token: string;
  readonly uid: number;
  readonly gid: number;
  /**
   * 이미 다른 터널이 쓰는 호스트 이름을 **빼앗는다.**
   *
   * 기본은 꺼져 있다 — 남의 서비스를 조용히 가로채는 것이 이 도구가 할 수 있는 가장 나쁜 일이다.
   * 승계처럼 사람이 그러기로 정한 자리에서만 켠다.
   */
  readonly overwriteDns?: boolean;
}

const LOCK_SUBDIR = ".locks";
const CRED_MODE = 0o600;

const lockKeys = (spec: DeploySpec): readonly string[] => [
  `tunnel-${spec.name}`,
  `dns-${spec.hostname}`,
  `access-${spec.hostname}`,
];

/** `KEY=VALUE` 한 줄씩. 값에 `=`이 들어갈 수 있으므로 첫 번째만 자른다. */
export const parseEnvFile = (content: string): Record<string, string> => {
  const env: Record<string, string> = {};
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at <= 0) continue;
    env[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return env;
};

/**
 * 터널을 찾거나 만든다. 있으면 **만들지 않는다** — 같은 이름으로 두 번 만들면 CLI가 거부한다.
 *
 * 새로 팔 때는 임시 경로에 받아 UUID를 안 뒤 옮긴다. **목적지에 파일이 있으면 옮기기 전에
 * 던진다** — 살아 있는 터널의 자격증명을 덮어쓰는 것은 되돌릴 수 없다.
 */
const ensureTunnel = async (input: UpInput, ports: Ports): Promise<string> => {
  const existing = await findTunnelByName(ports.exec, input.spec.name);
  if (existing !== undefined) {
    ports.log(`터널 ${input.spec.name} 이미 있음 (${existing.id})`);
    return existing.id;
  }
  if (ports.dryRun) return "<dry-run-tunnel-id>";

  const temp = path.join(input.stateDir, input.spec.name, ".new-tunnel-creds.json");
  ports.fs.mkdir(path.dirname(temp));
  const id = await createTunnel(ports.exec, input.spec.name, temp);

  const final = path.join(input.credentialsDir, `${id}.json`);
  if (ports.fs.exists(final)) throw new Error(`자격증명이 이미 있습니다: ${final} — 덮어쓰지 않습니다`);
  ports.fs.mkdir(input.credentialsDir);
  ports.fs.rename(temp, final);
  ports.fs.chmod(final, CRED_MODE);
  ports.log(`터널 ${input.spec.name} 생성 (${id})`);
  return id;
};

/** 컨테이너 둘을 `docker inspect`로 읽는다. 없으면 빈 배열 — 첫 배포다. */
const inspect = async (name: string, ports: Ports): Promise<readonly Inspected[]> => {
  const result = await ports.exec("docker", ["inspect", `${name}-app`, `${name}-tunnel`]);
  if (result.code !== 0) return [];
  return JSON.parse(result.stdout) as readonly Inspected[];
};

/**
 * 컨테이너가 running이 될 때까지. 터널에는 healthcheck가 없어 이쪽으로 본다.
 *
 * **터널이 안 뜨면 Access가 엣지에서 302를 주므로 겉보기에는 멀쩡하다.** 실제로 지나가는
 * 요청만 530을 받는데, 그건 배포한 사람이 아니라 사용자가 먼저 만난다.
 */
const waitRunning = async (container: string, ports: Ports, tries = 30): Promise<void> => {
  for (let i = 0; i < tries; i += 1) {
    const { stdout } = await ports.exec("docker", ["inspect", "-f", "{{.State.Status}}", container]);
    if (stdout.trim() === "running") return;
    await ports.sleep(1000);
  }
  throw new Error(`${container}이 뜨지 않았습니다`);
};

/** 앱이 healthy가 될 때까지. 안 되면 던진다 — 뜨지 않은 배포를 성공으로 적지 않는다. */
const waitHealthy = async (name: string, ports: Ports, tries = 60): Promise<void> => {
  for (let i = 0; i < tries; i += 1) {
    const { stdout } = await ports.exec("docker", ["inspect", "-f", "{{.State.Health.Status}}", `${name}-app`]);
    if (stdout.trim() === "healthy") return;
    await ports.sleep(2000);
  }
  throw new Error(`${name}-app이 healthy가 되지 않았습니다`);
};

/**
 * 순서에 이유가 있다 — **DNS를 연 바로 다음에 Access를 붙인다.**
 *
 * 그 사이가 이 앱이 무인증으로 인터넷에 열려 있는 유일한 창이다. ADE에는 인증이 없으므로
 * 창을 최대한 좁힌다.
 */
export const up = async (input: UpInput, ports: Ports): Promise<Manifest> => {
  const { spec } = input;
  const lockDir = path.join(input.stateDir, LOCK_SUBDIR);
  const taken: string[] = [];

  try {
    for (const key of lockKeys(spec)) {
      acquire(lockDir, key);
      taken.push(key);
    }

    const tunnelId = await ensureTunnel(input, ports);
    const credentialsPath = path.join(input.credentialsDir, `${tunnelId}.json`);
    if (!ports.dryRun && !ports.fs.exists(credentialsPath)) {
      throw new Error(`터널 ${tunnelId}의 자격증명이 없습니다: ${credentialsPath}`);
    }

    if (ports.dryRun) {
      ports.log(`[dry-run] DNS ${spec.hostname} → 터널 ${tunnelId}`);
    } else {
      // 기본은 덮어쓰지 않는다 — 다른 터널이 그 이름을 쓰고 있으면 서야 한다.
      await routeDns(ports.exec, tunnelId, spec.hostname, input.overwriteDns === true);
      ports.log(`DNS ${spec.hostname} → ${tunnelId}${input.overwriteDns === true ? " (덮어씀)" : ""}`);
    }

    let accessAppId: string | undefined;
    if (spec.accessEmails.length === 0) {
      ports.log(`⚠ accessEmails가 비어 있습니다 — ${spec.hostname}이 무인증으로 열립니다`);
    } else if (ports.dryRun) {
      ports.log(`[dry-run] Access 앱 ${spec.hostname} → ${String(spec.accessEmails.length)}명`);
    } else {
      const zoneId = await resolveZoneId(ports.fetch, input.token, input.zone);
      accessAppId = await ensureAccessApp(ports.fetch, input.token, zoneId, {
        hostname: spec.hostname,
        name: spec.name,
        emails: spec.accessEmails,
      });
      ports.log(`Access 앱 ${spec.hostname} (${accessAppId})`);
    }

    for (const mount of spec.mounts) {
      if (ports.fs.realpath(mount.source) === undefined) {
        throw new Error(`마운트 소스가 없습니다: ${mount.source} — docker가 root 소유로 만들기 전에 섭니다`);
      }
    }

    const env = spec.envFile === undefined || ports.dryRun ? {} : parseEnvFile(ports.fs.readFile(spec.envFile));

    const dir = path.join(input.stateDir, spec.name);
    const composeFile = path.join(dir, "compose.yml");
    const renderCtx = {
      sourceFile: input.sourceFile,
      generatedAt: ports.now(),
      tunnelId,
      credentialsPath,
      uid: input.uid,
      gid: input.gid,
      env,
    };
    const manifest: Manifest = {
      sourceFile: input.sourceFile,
      name: spec.name,
      hostname: spec.hostname,
      tunnelId,
      image: spec.image,
      accessAppId,
      generatedAt: renderCtx.generatedAt,
    };

    if (ports.dryRun) {
      ports.log(`[dry-run] ${dir}에 compose.yml·cloudflared.yml·manifest.json을 쓸 것`);
      return manifest;
    }

    ports.fs.mkdir(dir);
    ports.fs.writeFile(composeFile, renderCompose(spec, renderCtx));
    ports.fs.writeFile(path.join(dir, "cloudflared.yml"), renderCloudflared(spec, renderCtx));
    ports.fs.writeFile(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    const violations = findGhostMounts(await inspect(spec.name, ports), (p) => ports.fs.realpath(p) !== undefined, {
      project: spec.name,
      composeFile,
    });
    if (violations.length > 0) {
      throw new Error(`뜨기 전에 섭니다 — 컨테이너가 어긋나 있습니다:\n${violations.map((v) => `  ${v.container}: ${v.detail}`).join("\n")}`);
    }

    // **두 번 부른다.** 첫 번째는 `app`만 강제 재생성한다 — 터널이 불필요하게 재연결하지 않게.
    // 두 번째가 나머지(터널)를 띄운다. `compose up app`은 app만 띄우므로 이게 없으면
    // **터널이 아예 안 뜨는데 배포는 성공으로 보고된다**(2026-09-11 리허설에서 실측).
    const recreated = await ports.exec("docker", [
      "compose", "-p", spec.name, "-f", composeFile, "up", "-d", "--remove-orphans", "--force-recreate", "app",
    ]);
    if (recreated.code !== 0) throw new Error(`compose up 실패\n${recreated.stderr}`);

    await waitHealthy(spec.name, ports);

    const rest = await ports.exec("docker", [
      "compose", "-p", spec.name, "-f", composeFile, "up", "-d", "--no-recreate",
    ]);
    if (rest.code !== 0) throw new Error(`터널 기동 실패\n${rest.stderr}`);
    await waitRunning(`${spec.name}-tunnel`, ports);
    ports.log(`${spec.hostname} 떴습니다`);
    return manifest;
  } finally {
    for (const key of taken.reverse()) release(lockDir, key);
  }
};
