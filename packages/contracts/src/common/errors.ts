import { z } from "zod";

/**
 * 모든 에러 응답이 공유하는 형태.
 *
 * `code`를 여기서 좁히지 않고 열어둔다. 도메인마다 실패 종류가 다른데 여기서
 * 다 열거하면 도메인이 늘 때마다 이 파일이 부풀기 때문이다. 각 도메인이
 * `.extend()`로 자기 코드 집합으로 좁힌다.
 */
export const ErrorBody = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErrorBody = z.infer<typeof ErrorBody>;

/**
 * 도메인이 아니라 요청·프로토콜 자체가 잘못된 경우.
 *
 * `VersionMismatch`는 서버가 더 이상 받지 않는 `protocolVersion`이 왔을 때다.
 * 캐시된 구 클라이언트가 붙는 상황이라 클라이언트에게 갱신을 알려야 한다.
 */
export const ProtocolErrorCode = z.enum([
  "VersionMismatch",
  "BadRequest",
  "Internal",
]);
export type ProtocolErrorCode = z.infer<typeof ProtocolErrorCode>;

export const ProtocolErrorBody = ErrorBody.extend({ code: ProtocolErrorCode });
export type ProtocolErrorBody = z.infer<typeof ProtocolErrorBody>;
