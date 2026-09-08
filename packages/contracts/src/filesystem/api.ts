import { z } from "zod";
import { ErrorBody } from "../common/errors";
import { ProtocolVersioned } from "../common/version";
import { FileErrorCode } from "./types";

/** `/fs/*` 엔드포인트가 반환하는 에러 바디. */
export const FileErrorBody = ErrorBody.extend({ code: FileErrorCode });
export type FileErrorBody = z.infer<typeof FileErrorBody>;

/**
 * `uri`는 형식을 검증하지 않고 문자열로 받는다. 서버가 `URI.parse()`로 파싱하며
 * 잘못된 값은 거기서 걸린다. 스키마에서도 검사하면 같은 파싱이 두 번 돈다.
 */
export const ReadFileRequest = ProtocolVersioned.extend({
  uri: z.string(),
});
export type ReadFileRequest = z.infer<typeof ReadFileRequest>;

/**
 * `content`는 파일 바이트를 base64로 인코딩한 값이다. 전송이 JSON이라 바이트를
 * 그대로 실을 수 없다.
 *
 * `etag`는 그 바이트를 읽은 시점의 버전이다. 지금은 쓰는 데가 없지만, 나중에
 * 쓰기가 이 값을 되돌려줘 그사이 끼어든 변경을 감지한다. 그때 추가하면 응답
 * 스키마가 바뀌고 그건 곧 프로토콜 변경이다.
 */
export const ReadFileResponse = z.object({
  content: z.base64(),
  etag: z.string(),
});
export type ReadFileResponse = z.infer<typeof ReadFileResponse>;
