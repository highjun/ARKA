import path from "node:path";
import type { GitFileStatus, GitStatusResponse, StagedChange, UnstagedChange } from "#contracts";
import { GitError } from "../domain/errors";
import type { GitRunner } from "./gitCommand";

/** `git status --porcelain=v1 -z`의 두 글자 코드를 계약의 상태로. */
const stagedOf = (x: string): StagedChange | null => {
  switch (x) {
    case "A":
      return "added";
    case "M":
      return "modified";
    case "D":
      return "deleted";
    case "R":
    case "C":
      return "renamed";
    default:
      return null;
  }
};
const unstagedOf = (x: string, y: string): UnstagedChange | null => {
  if (x === "?" && y === "?") return "untracked";
  switch (y) {
    case "M":
      return "modified";
    case "D":
      return "deleted";
    default:
      return null;
  }
};

/**
 * porcelain v1(`-z`)을 푼다. 항목은 NUL로 나뉘고, 이름이 바뀐 항목은 `새 경로 NUL 옛 경로`로 둘이 온다.
 * 순수 함수라 여기가 테스트의 중심이다.
 */
export const parsePorcelain = (output: string): GitFileStatus[] => {
  const parts = output.split("\0").filter((part) => part !== "");
  const files: GitFileStatus[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i] ?? "";
    const x = part.charAt(0);
    const y = part.charAt(1);
    const path = part.slice(3);
    // R/C는 다음 조각이 옛 경로다 — 건너뛴다.
    if (x === "R" || x === "C") i += 1;
    // 충돌(U)은 아직 다루지 않는다 — 수정으로 보인다.
    const staged = stagedOf(x === "U" ? "M" : x);
    const unstaged = unstagedOf(x, y === "U" ? "M" : y);
    if (staged === null && unstaged === null) continue;
    files.push({ path, staged, unstaged });
  }
  return files;
};

/**
 * 워크스페이스가 저장소의 하위 디렉터리일 수 있다 — porcelain 경로는 저장소 루트 기준이므로 워크스페이스
 * 기준으로 바꾸고, 워크스페이스 밖의 변경은 뺀다.
 */
export const status = async (git: GitRunner, workspaceRoot: string): Promise<GitStatusResponse> => {
  try {
    const [branchOut, statusOut, topOut] = await Promise.all([
      git(["branch", "--show-current"]),
      git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
      git(["rev-parse", "--show-toplevel"]),
    ]);
    const branch = branchOut.trim();
    const top = topOut.trim();
    const files = parsePorcelain(statusOut).flatMap((file) => {
      const relative = path.relative(workspaceRoot, path.join(top, file.path));
      if (relative.startsWith("..") || path.isAbsolute(relative)) return [];
      return [{ ...file, path: relative }];
    });
    return { repository: true, branch: branch === "" ? null : branch, files };
  } catch (error) {
    if (error instanceof GitError && error.code === "NotARepository") return { repository: false, branch: null, files: [] };
    throw error;
  }
};

/**
 * 저장소가 아닌 곳에서 `git diff --cached`는 `--no-index` 모드로 빠져 "알 수 없는 옵션"으로 죽는다 —
 * 그 메시지로는 원인을 알 수 없으니 먼저 저장소인지 확인해 `NotARepository`를 내게 한다.
 */
const ensureRepository = (git: GitRunner): Promise<string> => git(["rev-parse", "--git-dir"]);

/** 추적되지 않은 파일은 `diff --no-index`로 전체를 추가로 보여 준다 — 차이가 있으면 1로 끝나므로 그 코드를 허용한다. */
export const diff = async (git: GitRunner, path: string, staged: boolean): Promise<string> => {
  await ensureRepository(git);
  if (!staged) {
    const untracked = await git(["ls-files", "--others", "--exclude-standard", "--", path]);
    if (untracked.trim() !== "") return git(["diff", "--no-index", "--", "/dev/null", path], { okExitCodes: [1] });
  }
  return git(staged ? ["diff", "--cached", "--", path] : ["diff", "--", path]);
};

/** `add -A`라 지워진 파일의 삭제도 함께 올린다. */
export const stage = async (git: GitRunner, paths: readonly string[]): Promise<string> => {
  await ensureRepository(git);
  return git(["add", "-A", "--", ...paths]);
};

/** 작업 트리는 건드리지 않는다 — 인덱스에서만 뺀다. */
export const unstage = async (git: GitRunner, paths: readonly string[]): Promise<string> => {
  await ensureRepository(git);
  return git(["reset", "-q", "--", ...paths]);
};

/** 스테이지가 비어 있으면 `NothingToCommit`으로 던진다 — 빈 커밋을 만들지 않는다. */
export const commit = async (git: GitRunner, message: string): Promise<string> => {
  await ensureRepository(git);
  const staged = await git(["diff", "--cached", "--name-only"]);
  if (staged.trim() === "") throw new GitError("NothingToCommit", "nothing staged to commit");
  await git(["commit", "-q", "-m", message]);
  return (await git(["rev-parse", "HEAD"])).trim();
};
