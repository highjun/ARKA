import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGitRunner } from "./gitCommand";

/**
 * **git에게 무엇을 넘기는가**만 본다. git이 무엇을 하는지는 `gitOperations.test.ts`가 본다.
 *
 * git은 사용자 워크스페이스 안에서 돌고 그 안의 `.git/config`는 워크스페이스 내용이다 —
 * 훅이나 credential helper가 붙으면 환경을 읽는다.
 */
let root: string;

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "arka-gitenv-"));
  await createGitRunner(root)(["init", "-q"]);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

/** git에게 환경을 통째로 찍게 시킨다 — `--exec-path`를 쓰지 않고 git이 실제로 본 것을 받는다. */
const childEnv = async (): Promise<string> =>
  createGitRunner(root)(["-c", "alias.dumpenv=!env", "dumpenv"]);

describe("git 자식 프로세스의 환경", () => {
  it("부모의 비밀을 넘기지 않는다 — 통째로 넘기면 워크스페이스의 훅이 읽는다", async () => {
    process.env["ARKA_TEST_LEAK_TOKEN"] = "sk-must-not-reach-git";

    try {
      expect(await childEnv()).not.toContain("sk-must-not-reach-git");
    } finally {
      delete process.env["ARKA_TEST_LEAK_TOKEN"];
    }
  });

  it("git이 돌아가는 데 필요한 것은 넘긴다 — PATH가 없으면 git이 자기 하위 명령을 못 찾는다", async () => {
    expect(await childEnv()).toContain("PATH=");
  });

  it("프롬프트를 띄우지 않는다 — 뜨면 요청이 타임아웃까지 멈춘다", async () => {
    expect(await childEnv()).toContain("GIT_TERMINAL_PROMPT=0");
  });

  it("출력 로케일을 고정한다 — 파싱이 언어를 타면 안 된다", async () => {
    expect(await childEnv()).toContain("LC_ALL=C");
  });
});
