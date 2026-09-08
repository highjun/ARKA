import { z } from "zod";

/**
 * 경로는 전부 **워크스페이스 루트 기준 상대 경로**다. 루트 자신은 `''`.
 * 절대 경로를 쓰지 않는 것은 서버가 어디에 뿌리내렸는지가 화면에 새지 않게 하기 위해서다.
 */

export const FileEntryType = z.enum(["dir", "file"]);
export type FileEntryType = z.infer<typeof FileEntryType>;

/**
 * 이름과 종류뿐이다 — 트리를 그리는 데 그 둘이면 된다.
 *
 * `size`/`mtime`을 받던 시절이 있었는데 아무도 읽지 않았고, 서버는 그걸 채우려고 엔트리마다
 * `stat`을 해야 했다. 계약이 요구하지 않으면 그 비용도 사라진다.
 */
export const FileEntry = z.object({
  name: z.string(),
  type: FileEntryType,
});
export type FileEntry = z.infer<typeof FileEntry>;

export const DirectoryListing = z.object({
  path: z.string(),
  /** 상위 경로. 루트면 `null`. */
  parent: z.string().nullable(),
  entries: z.array(FileEntry),
});
export type DirectoryListing = z.infer<typeof DirectoryListing>;

export const FileContent = z.object({
  path: z.string(),
  /** 바이너리면 빈 문자열이다 — 화면은 `encoding`을 보고 "볼 수 없는 파일"로 그린다. */
  content: z.string(),
  /** 상한을 넘어 앞부분만 왔다. 이 파일을 다시 쓰면 뒷부분이 통째로 사라진다. */
  truncated: z.boolean(),
  encoding: z.enum(["utf8", "binary"]),
});
export type FileContent = z.infer<typeof FileContent>;

/**
 * 파일시스템 동작의 실패 종류.
 *
 * 클라이언트가 원격 프로바이더를 쓰므로 HTTP 상태 코드를 전송 경계에서 한 번만 이 코드로
 * 바꾼다. 호출부마다 상태 코드를 해석하면 에러 처리가 곳곳에 흩어진다.
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
