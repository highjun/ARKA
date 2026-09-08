import { execFile } from "node:child_process";
import { GitError } from "../domain/errors";

/** 한 명령의 한도. 큰 저장소의 status도 이 안에 끝난다. 넘으면 무언가 걸린 것이다. */
const TIMEOUT_MS = 30_000;
const MAX_OUTPUT = 16 * 1024 * 1024;

export type GitRunOptions = {
  /** 이 종료 코드는 실패가 아니다 — `diff --no-index`는 차이가 있으면 1로 끝난다. */
  readonly okExitCodes?: readonly number[];
};
export type GitRunner = (args: readonly string[], options?: GitRunOptions) => Promise<string>;

/**
 * `git -C <root> …`를 셸 없이 실행한다 — 인자가 배열로 가므로 경로에 공백·따옴표가 있어도 그대로다.
 * 실패는 `GitError`로: 저장소 아님 → `NotARepository`, git 없음 → `Unavailable`, 나머지 → `CommandFailed`.
 */
export const createGitRunner = (root: string): GitRunner => (args, { okExitCodes = [] } = {}) =>
  new Promise((resolve, reject) => {
    execFile(
      "git",
      ["-C", root, ...args],
      { timeout: TIMEOUT_MS, maxBuffer: MAX_OUTPUT, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" } },
      (error, stdout, stderr) => {
        if (error === null) {
          resolve(stdout);
          return;
        }
        const code = (error as NodeJS.ErrnoException).code;
        if (typeof code === "number" && okExitCodes.includes(code)) {
          resolve(stdout);
          return;
        }
        if (code === "ENOENT") {
          reject(new GitError("Unavailable", "git is not installed on the server"));
          return;
        }
        const detail = stderr.trim() || error.message;
        if (/not a git repository/iu.test(detail)) {
          reject(new GitError("NotARepository", detail));
          return;
        }
        reject(new GitError("CommandFailed", detail));
      },
    );
  });
