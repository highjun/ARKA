import { realpathSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GitError } from "../domain/errors";
import { createGitRunner } from "./gitCommand";
import { commit, diff, parsePorcelain, stage, status, unstage } from "./gitOperations";

describe("parsePorcelain", () => {
  it("스테이지·작업 트리·추적 안 됨을 가른다", () => {
    const out = ["M  a.ts", " M b.ts", "MM c.ts", "?? d.ts", "A  e.ts", "D  f.ts", " D g.ts"].join("\0") + "\0";
    expect(parsePorcelain(out)).toEqual([
      { path: "a.ts", staged: "modified", unstaged: null },
      { path: "b.ts", staged: null, unstaged: "modified" },
      { path: "c.ts", staged: "modified", unstaged: "modified" },
      { path: "d.ts", staged: null, unstaged: "untracked" },
      { path: "e.ts", staged: "added", unstaged: null },
      { path: "f.ts", staged: "deleted", unstaged: null },
      { path: "g.ts", staged: null, unstaged: "deleted" },
    ]);
  });

  it("이름이 바뀐 항목은 새 경로만 남기고 옛 경로 조각을 건너뛴다", () => {
    expect(parsePorcelain("R  new.ts\0old.ts\0 M x.ts\0")).toEqual([
      { path: "new.ts", staged: "renamed", unstaged: null },
      { path: "x.ts", staged: null, unstaged: "modified" },
    ]);
  });
});

/** 진짜 git으로 임시 저장소를 만든다 — porcelain 형식과 종료 코드는 실물이어야 뜻이 있다. */
describe("git 조작 (실제 저장소)", () => {
  let root: string;
  let git: ReturnType<typeof createGitRunner>;

  beforeAll(async () => {
    root = realpathSync(await mkdtemp(path.join(os.tmpdir(), "ade-git-")));
    git = createGitRunner(root);
    await git(["init", "-q", "-b", "main"]);
    await git(["config", "user.email", "test@example.com"]);
    await git(["config", "user.name", "test"]);
    await writeFile(path.join(root, "a.txt"), "one\n");
    await git(["add", "a.txt"]);
    await git(["commit", "-q", "-m", "init"]);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("상태에 브랜치와 변경이 있다", async () => {
    await writeFile(path.join(root, "a.txt"), "two\n");
    await writeFile(path.join(root, "b.txt"), "new\n");
    const result = await status(git, root);
    expect(result).toEqual({
      repository: true,
      branch: "main",
      files: [
        { path: "a.txt", staged: null, unstaged: "modified" },
        { path: "b.txt", staged: null, unstaged: "untracked" },
      ],
    });
  });

  it("diff는 작업 트리·스테이지·추적 안 된 파일을 보여 준다", async () => {
    expect(await diff(git, "a.txt", false)).toContain("-one");
    expect(await diff(git, "a.txt", true)).toBe("");
    expect(await diff(git, "b.txt", false)).toContain("+new");
  });

  it("스테이지·해제·커밋", async () => {
    await stage(git, ["a.txt", "b.txt"]);
    expect((await status(git, root)).files.map((f) => f.staged)).toEqual(["modified", "added"]);
    await unstage(git, ["b.txt"]);
    expect((await status(git, root)).files.find((f) => f.path === "b.txt")).toMatchObject({ staged: null, unstaged: "untracked" });
    const hash = await commit(git, "second");
    expect(hash).toMatch(/^[0-9a-f]{40}$/u);
    expect((await status(git, root)).files).toEqual([{ path: "b.txt", staged: null, unstaged: "untracked" }]);
  });

  it("스테이지된 것이 없으면 NothingToCommit", async () => {
    await expect(commit(git, "x")).rejects.toMatchObject({ code: "NothingToCommit" });
  });

  it("워크스페이스가 저장소의 하위 디렉터리면 경로를 그 기준으로 바꾸고 밖의 변경은 뺀다", async () => {
    const sub = path.join(root, "sub");
    await (await import("node:fs/promises")).mkdir(sub, { recursive: true });
    await writeFile(path.join(sub, "inner.txt"), "x\n");
    const result = await status(createGitRunner(sub), sub);
    expect(result.files).toEqual([{ path: "inner.txt", staged: null, unstaged: "untracked" }]);
  });

  it("저장소가 아니면 repository: false", async () => {
    const plain = realpathSync(await mkdtemp(path.join(os.tmpdir(), "ade-plain-")));
    try {
      expect(await status(createGitRunner(plain), plain)).toEqual({ repository: false, branch: null, files: [] });
      await expect(createGitRunner(plain)(["log"])).rejects.toBeInstanceOf(GitError);
    } finally {
      await rm(plain, { recursive: true, force: true });
    }
  });
});
