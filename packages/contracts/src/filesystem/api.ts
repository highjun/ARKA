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

/** SSE로 흘려보내는 파일 변경 알림. 경로 하나가 바뀌었다는 사실만 담는다. */
export const WatchEvent = z.object({ path: z.string() });
export type WatchEvent = z.infer<typeof WatchEvent>;
