import { execFile } from "node:child_process";
import { GitError } from "../domain/errors";

/** 한 명령의 한도. 큰 저장소의 status도 이 안에 끝난다. 넘으면 무언가 걸린 것이다. */
const TIMEOUT_MS = 30_000;
const MAX_OUTPUT = 16 * 1024 * 1024;

/** 한 번의 git 호출에 붙는 선택지. */
export type GitRunOptions = {
  /** 이 종료 코드는 실패가 아니다 — `diff --no-index`는 차이가 있으면 1로 끝난다. */
  readonly okExitCodes?: readonly number[];
};
/** git을 부르는 유일한 통로. 이 타입을 바꿔 끼우면 테스트가 실제 git 없이 돈다. */
export type GitRunner = (args: readonly string[], options?: GitRunOptions) => Promise<string>;

/**
 * git에게 넘길 환경. **부모의 것을 통째로 넘기지 않는다**.
 *
 * git은 사용자 워크스페이스 **안에서** 돌고, 그 안의 `.git/config`는 워크스페이스 내용이다 —
 * 훅이나 credential helper가 붙으면 환경을 읽는다. 비밀이 거기 있을 이유가 없다.
 */
const gitEnv = (): NodeJS.ProcessEnv => {
  // `PATH`는 실행 파일을 찾는 데, `HOME`은 `~/.gitconfig`를 읽는 데 필요하다.
  const passed: NodeJS.ProcessEnv = {};
  for (const key of ["PATH", "HOME", "TZ"]) {
    const value = process.env[key];
    if (value !== undefined) passed[key] = value;
  }
  // 프롬프트를 띄우지 않는다(멈춘다). 출력 로케일을 고정한다(파싱이 언어를 타지 않게).
  return { ...passed, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" };
};

/**
 * `git -C <root> …`를 셸 없이 실행한다 — 인자가 배열로 가므로 경로에 공백·따옴표가 있어도 그대로다.
 * 실패는 `GitError`로: 저장소 아님 → `NotARepository`, git 없음 → `Unavailable`, 나머지 → `CommandFailed`.
 */
export const createGitRunner = (root: string): GitRunner => (args, { okExitCodes = [] } = {}) =>
  new Promise((resolve, reject) => {
    execFile(
      "git",
      ["-C", root, ...args],
      { timeout: TIMEOUT_MS, maxBuffer: MAX_OUTPUT, env: gitEnv() },
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
