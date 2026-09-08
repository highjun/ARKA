import { z } from "zod";
import { ErrorBody } from "../common/errors";

/**
 * 워크스페이스의 Git 상태·스테이징·커밋. VSCode 내장 git 익스텐션의 최소 집합이다.
 * 서버가 `git` CLI를 워크스페이스 루트에서 돌린다 — 라이브러리 구현체를 두지 않는다.
 */

/** 인덱스(스테이지) 쪽 상태. */
export const StagedChange = z.enum(["added", "modified", "deleted", "renamed"]);
export type StagedChange = z.infer<typeof StagedChange>;
/** 작업 트리 쪽 상태. */
export const UnstagedChange = z.enum(["modified", "deleted", "untracked"]);
export type UnstagedChange = z.infer<typeof UnstagedChange>;

export const GitFileStatus = z.object({
  /** 워크스페이스 루트 기준 상대 경로. 이름이 바뀐 파일은 새 경로. */
  path: z.string(),
  staged: StagedChange.nullable(),
  unstaged: UnstagedChange.nullable(),
});
export type GitFileStatus = z.infer<typeof GitFileStatus>;

/** `GET /api/git/status` */
export const GitStatusResponse = z.object({
  /** 워크스페이스가 Git 저장소가 아니면 `false`이고 나머지는 비어 있다. */
  repository: z.boolean(),
  /** 분리된 HEAD면 `null`. */
  branch: z.string().nullable(),
  files: z.array(GitFileStatus),
});
export type GitStatusResponse = z.infer<typeof GitStatusResponse>;

/** `GET /api/git/diff?path=&staged=` */
export const GitDiffRequest = z.object({
  path: z.string().min(1),
  staged: z.preprocess((value) => (value === "true" ? true : value === "false" ? false : value), z.boolean()).default(false),
});
export type GitDiffRequest = z.infer<typeof GitDiffRequest>;

export const GitDiffResponse = z.object({
  /** unified diff 원문. 추적되지 않은 파일은 전체가 추가로 보인다. 변화가 없으면 빈 문자열. */
  diff: z.string(),
});
export type GitDiffResponse = z.infer<typeof GitDiffResponse>;

/** `POST /api/git/stage`, `POST /api/git/unstage` */
export const GitPathsRequest = z.object({ paths: z.array(z.string().min(1)).min(1) });
export type GitPathsRequest = z.infer<typeof GitPathsRequest>;

/** `POST /api/git/commit` — 스테이지된 것을 커밋한다. */
export const GitCommitRequest = z.object({ message: z.string().trim().min(1) });
export type GitCommitRequest = z.infer<typeof GitCommitRequest>;

export const GitCommitResponse = z.object({ hash: z.string().min(1) });
export type GitCommitResponse = z.infer<typeof GitCommitResponse>;

export const GitErrorCode = z.enum([
  "NotARepository",
  /** 스테이지된 변경이 없다. */
  "NothingToCommit",
  /** git이 실패했다 — `message`에 stderr가 실린다. */
  "CommandFailed",
  /** `git`이 서버에 없다. */
  "Unavailable",
]);
export type GitErrorCode = z.infer<typeof GitErrorCode>;

export const GitErrorBody = ErrorBody.extend({ code: GitErrorCode });
export type GitErrorBody = z.infer<typeof GitErrorBody>;
