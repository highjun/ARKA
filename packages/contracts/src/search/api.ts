import { z } from "zod";

/**
 * 워크스페이스 전체 텍스트 검색. VSCode의 "파일에서 찾기"에 해당한다.
 *
 * 쿼리 문자열로도 오므로(`GET /api/search?query=…`) 불리언은 `"true"`/`"false"` 문자열을 받는다 —
 * `z.coerce.boolean()`은 `"false"`를 참으로 만든다.
 */
const flag = z.preprocess((value) => (value === "true" ? true : value === "false" ? false : value), z.boolean());

export const SearchRequest = z.object({
  query: z.string().min(1),
  /** 이 경로(디렉터리) 아래만. 루트는 빈 문자열. */
  path: z.string().default(""),
  regex: flag.default(false),
  caseSensitive: flag.default(false),
  maxResults: z.coerce.number().int().min(1).max(1000).default(200),
});
export type SearchRequest = z.infer<typeof SearchRequest>;

export const SearchMatch = z.object({
  path: z.string(),
  /** 1부터. */
  line: z.number().int().positive(),
  /** 1부터, 문자 단위. */
  column: z.number().int().positive(),
  /** 그 줄의 내용. 길면 잘린다. */
  preview: z.string(),
});
export type SearchMatch = z.infer<typeof SearchMatch>;

export const SearchResponse = z.object({
  matches: z.array(SearchMatch),
  /** `maxResults`에 걸려 멈췄다. */
  truncated: z.boolean(),
  /** 실제로 읽은 텍스트 파일 수. */
  filesScanned: z.number().int().nonnegative(),
});
export type SearchResponse = z.infer<typeof SearchResponse>;
