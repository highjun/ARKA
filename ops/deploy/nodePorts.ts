import { execFile } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import type { Exec } from "./cloudflared.ts";
import type { FsPort, Ports } from "./ports.ts";

/**
 * 포트를 실물에 잇는다. **여기만 Node에 묶인다** — 위의 것들은 전부 이 타입만 안다.
 */

const run = promisify(execFile);

/**
 * 프로세스를 부른다. **종료 코드를 던지지 않고 값으로 돌려준다** — 호출부가 0이 아닌 것을
 * 정상으로 다루는 자리가 있어서다(예: 컨테이너가 아직 없을 때의 `docker inspect`).
 *
 * 셸을 거치지 않는다(`execFile`) — 인자를 셸이 다시 해석하지 않으므로 주입 경로가 없다.
 */
export const nodeExec: Exec = async (file, args) => {
  try {
    // `docker inspect` 출력이 크다. 기본 1MB로는 잘린다.
    const { stdout, stderr } = await run(file, [...args], { maxBuffer: 32 * 1024 * 1024 });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string; message?: string };
    // 프로세스를 띄우지도 못한 경우(ENOENT)는 코드가 숫자가 아니다 — 그건 진짜 예외다.
    if (typeof failure.code !== "number") throw error;
    return { code: failure.code, stdout: failure.stdout ?? "", stderr: failure.stderr ?? failure.message ?? "" };
  }
};

/** `realpath`가 던지는 자리를 `undefined`로 바꾼다 — 끊어진 심링크도 "없음"이다. */
export const nodeFs: FsPort = {
  exists: (p) => existsSync(p),
  realpath: (p) => {
    try {
      return realpathSync(p);
    } catch {
      return undefined;
    }
  },
  readFile: (p) => readFileSync(p, "utf8"),
  writeFile: (p, content) => void writeFileSync(p, content),
  mkdir: (p) => void mkdirSync(p, { recursive: true }),
  rename: (from, to) => void renameSync(from, to),
  chmod: (p, mode) => void chmodSync(p, mode),
  rm: (p) => void rmSync(p, { force: true, recursive: true }),
};

/** 실물 포트 묶음. `dry-run`만 밖에서 정한다. */
export const nodePorts = (dryRun: boolean): Ports => ({
  exec: nodeExec,
  fetch: (url, init) => fetch(url, init),
  fs: nodeFs,
  // stdout이 아니라 stderr다 — 결과를 파이프로 넘길 때 로그가 섞이지 않게.
  log: (message) => void console.error(message),
  now: () => new Date().toISOString(),
  sleep: async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  dryRun,
});
