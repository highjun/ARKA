import type { GitErrorCode } from "#contracts";

/** Git 동작의 실패. `code`는 그대로 클라이언트에 전달된다. */
export class GitError extends Error {
  readonly code: GitErrorCode;

  constructor(code: GitErrorCode, message: string) {
    super(message);
    this.name = "GitError";
    this.code = code;
  }
}
