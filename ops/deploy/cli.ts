import os from "node:os";
import path from "node:path";
import { DEFAULT, PURGE, down } from "./down.ts";
import { nodePorts, nodeFs } from "./nodePorts.ts";
import { parseEnvFile, up } from "./up.ts";
import { formatStatus, status } from "./status.ts";
import { DeploySpec } from "./spec.ts";
import type { DownOptions } from "./down.ts";

/**
 * `up` · `down` · `status`를 실물에 잇는다.
 *
 * **`ops/package.json`에 스크립트로 두지 않는다** — `deploy`는 pnpm의 내장 명령이라
 * `pnpm --filter ops deploy`가 우리 것이 아니라 그것을 부른다(2026-09-11 실측). 파일을 직접 부른다.
 *
 * ```sh
 * node ops/deploy/cli.ts up ops/deploy/ade.deploy.ts [--dry-run] [--overwrite-dns]
 * node ops/deploy/cli.ts down ade [--purge] [--remove-access] [--dry-run]
 * node ops/deploy/cli.ts status ade
 * ```
 */

/** 생성물이 사는 곳. 저장소가 아니다 — 기계가 만든 YAML을 커밋하지 않는다. */
const STATE_DIR = process.env["ADE_STATE_DIR"] ?? path.join(os.homedir(), ".local/state/ade/deploy");

/** 터널 자격증명. 기존 관례와 같은 자리를 쓴다(`0700`). */
const CREDENTIALS_DIR = process.env["ADE_CREDENTIALS_DIR"] ?? path.join(os.homedir(), "ARKA/secure/cloudflared");

/** Cloudflare 토큰이 든 파일. **저장소에 넣지 않는다.** */
const CLOUDFLARE_ENV = process.env["ADE_CLOUDFLARE_ENV"] ?? path.join(os.homedir(), "ARKA/secure/env/cloudflare.env");

const ZONE = process.env["ADE_ZONE"] ?? "sangjun.dev";

/**
 * 토큰을 파일에서 읽는다. **환경변수를 먼저 보지 않는다** — 셸 이력에 남는 경로를 열어 두면
 * 언젠가 거기로 샌다.
 */
const readToken = (): string => {
  if (!nodeFs.exists(CLOUDFLARE_ENV)) {
    throw new Error(`Cloudflare 토큰 파일이 없습니다: ${CLOUDFLARE_ENV}`);
  }
  const token = parseEnvFile(nodeFs.readFile(CLOUDFLARE_ENV))["CLOUDFLARE_API_TOKEN"];
  if (token === undefined || token === "") throw new Error(`${CLOUDFLARE_ENV}에 CLOUDFLARE_API_TOKEN이 없습니다`);
  return token;
};

/** `--purge`와 개별 플래그를 합친다. `--purge`가 켜도 access는 따로 켜야 한다. */
export const parseDownFlags = (argv: readonly string[]): DownOptions => {
  const base = argv.includes("--purge") ? PURGE : DEFAULT;
  return {
    containers: !argv.includes("--keep-containers"),
    tunnel: base.tunnel || argv.includes("--remove-tunnel"),
    dns: base.dns || argv.includes("--remove-dns"),
    image: base.image || argv.includes("--remove-image"),
    state: base.state || argv.includes("--remove-state"),
    access: argv.includes("--remove-access"),
  };
};

/** `*.deploy.ts`가 내보내는 스펙 하나를 읽는다. */
const loadSpec = async (file: string): Promise<DeploySpec> => {
  const absolute = path.resolve(file);
  const module = (await import(absolute)) as Record<string, unknown>;
  const found = Object.values(module).find((value) => DeploySpec.safeParse(value).success);
  if (found === undefined) throw new Error(`${file}에서 DeploySpec을 찾지 못했습니다`);
  return DeploySpec.parse(found);
};

const main = async (): Promise<void> => {
  const [command, target, ...flags] = process.argv.slice(2);
  const dryRun = flags.includes("--dry-run");
  const ports = nodePorts(dryRun);
  if (target === undefined) throw new Error(`대상이 필요합니다 — 스펙 파일 또는 배포 이름`);

  if (command === "status") {
    console.log(formatStatus(await status(target, STATE_DIR, ports)));
    return;
  }

  if (command === "up") {
    const spec = await loadSpec(target);
    const manifest = await up(
      {
        spec,
        sourceFile: path.resolve(target),
        stateDir: STATE_DIR,
        credentialsDir: CREDENTIALS_DIR,
        zone: ZONE,
        token: readToken(),
        uid: process.getuid?.() ?? 1000,
        gid: process.getgid?.() ?? 1000,
        overwriteDns: flags.includes("--overwrite-dns"),
      },
      ports,
    );
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  if (command === "down") {
    const options = parseDownFlags(flags);
    const result = await down(
      { name: target, stateDir: STATE_DIR, credentialsDir: CREDENTIALS_DIR, zone: ZONE, token: readToken() },
      options,
      ports,
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  throw new Error(`모르는 명령입니다: ${String(command)} — up · down · status 중 하나입니다`);
};

if (process.argv[1] === import.meta.filename) {
  main().catch((error: unknown) => {
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
