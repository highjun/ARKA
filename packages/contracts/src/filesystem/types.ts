import { z } from "zod";

/**
 * 파일시스템 동작의 실패 종류.
 *
 * 클라이언트가 원격 프로바이더를 쓰므로 HTTP 상태 코드를 전송 경계에서 한 번만
 * 이 코드로 바꾼다. 호출부마다 상태 코드를 해석하면 에러 처리가 곳곳에
 * 흩어진다.
 *
 * `Conflict`는 etag 불일치다. 버그가 아니라 diff를 보여주고 사용자가 골라야
 * 하는 상태다.
 */
export const FileErrorCode = z.enum([
  "NotFound",
  "NoPermission",
  "Exists",
  "NotADirectory",
  "IsADirectory",
  "Conflict",
  "Unavailable",
]);
export type FileErrorCode = z.infer<typeof FileErrorCode>;
