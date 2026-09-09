import type { FileErrorCode } from "#contracts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { FileError } from "../domain/errors";

/**
 * 파일 조작이 던진 것을 HTTP로 옮긴다. `/api/files*` 라우트 그룹이 전부 이것을 `onError`로 건다.
 *
 * `FileError`도 errno도 아닌 것은 여기 몫이 아니다 — `undefined`를 돌려 상위(앱 루트)가
 * 처리하게 한다. 그래야 정체 모를 오류의 메시지가 파일 오류로 위장해 밖으로 나가지 않는다.
 */
export const fileErrorResponse = (error: Error, c: Context): Response | undefined => {
  if (error instanceof FileError) {
    return c.json({ code: error.code, message: error.message }, statusOf(error.code));
  }
  const errno = (error as NodeJS.ErrnoException).code;
  if (typeof errno !== "string") return undefined;
  const mapped = fromErrno(errno);
  return c.json({ code: mapped, message: error.message }, statusOf(mapped));
};

function fromErrno(code: string): FileErrorCode {
  switch (code) {
    case "ENOENT":
      return "NotFound";
    case "EACCES":
    case "EPERM":
    case "EROFS":
      return "NoPermission";
    case "EEXIST":
      return "Exists";
    case "EISDIR":
      return "IsADirectory";
    case "ENOTDIR":
      return "NotADirectory";
    default:
      return "Unavailable";
  }
}

function statusOf(code: FileErrorCode): ContentfulStatusCode {
  switch (code) {
    case "NotFound":
      return 404;
    case "NoPermission":
      return 403;
    case "Exists":
    case "Conflict":
      return 409;
    case "IsADirectory":
    case "NotADirectory":
      // 대상은 있는데 요청이 그 종류를 잘못 짚은 것이다.
      return 400;
    case "Unavailable":
      return 503;
  }
}
