import type { FileErrorCode } from "#contracts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { FileError } from "../domain/errors";

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
      return 400;
    case "Unavailable":
      return 503;
  }
}
