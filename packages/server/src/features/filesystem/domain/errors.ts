import type { FileErrorCode } from "#contracts";

/**
 * 파일시스템 동작의 실패. `code`는 그대로 클라이언트에 전달되므로
 * contracts의 `FileErrorCode`만 담는다.
 *
 * `message`는 서버 로그와 디버깅용이다. 클라이언트가 분기 판단에 쓰면 안 된다.
 */
export class FileError extends Error {
  readonly code: FileErrorCode;

  constructor(code: FileErrorCode, message: string) {
    super(message);
    this.name = "FileError";
    this.code = code;
  }
}
