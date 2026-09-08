import { z } from "zod";
import { ErrorBody } from "../common/errors";
import { FileEntryType } from "./types";

/** `/api/files*` 엔드포인트가 반환하는 에러 바디. */
export const FileErrorBody = ErrorBody;
export type FileErrorBody = z.infer<typeof FileErrorBody>;

/**
 * 쓰기·생성·이동·삭제가 공통으로 돌려주는 응답. 바뀐 대상의 경로만 알린다 — 호출부가
 * 그것으로 자기 상태를 갱신한다.
 */
export const PathResult = z.object({ path: z.string() });
export type PathResult = z.infer<typeof PathResult>;

export const WriteFileRequest = z.object({
  path: z.string(),
  content: z.string(),
});
export type WriteFileRequest = z.infer<typeof WriteFileRequest>;

export const CreateEntryRequest = z.object({
  path: z.string(),
  type: FileEntryType,
});
export type CreateEntryRequest = z.infer<typeof CreateEntryRequest>;

export const MoveEntryRequest = z.object({
  from: z.string(),
  to: z.string(),
});
export type MoveEntryRequest = z.infer<typeof MoveEntryRequest>;

/**
 * SSE로 흘려보내는 파일 변경 알림. 짧은 시간에 몰린 변경을 한 프레임으로 묶어 보낸다.
 *
 * 빈 배열은 하트비트다 — 실제 변경은 항상 하나 이상을 담으므로 겹치지 않는다. 클라이언트는
 * 빈 배열을 "연결이 살아 있다"로만 읽고 `onChange`를 부르지 않는다.
 */
export const WatchEvent = z.object({ paths: z.array(z.string()) });
export type WatchEvent = z.infer<typeof WatchEvent>;
