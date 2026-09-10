import type { GitErrorCode } from "#contracts";

/** Git 동작의 실패. `code`는 그대로 클라이언트에 전달된다. */
export class GitError extends Error {
  readonly code: GitErrorCode;

  /** `message`는 git의 출력을 그대로 담을 수 있다 — 경로가 섞이므로 로그에만 남긴다. */
  constructor(code: GitErrorCode, message: string) {
    super(message);
    this.name = "GitError";
    this.code = code;
  }
}
