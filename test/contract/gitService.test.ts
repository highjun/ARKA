import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach } from "vitest";
import { createGitServicePort } from "../../packages/client/src/extensions/git/infra/HttpGitService";
import { testGitServiceContract } from "../../packages/client/src/extensions/git/model/gitService.contract";
import { createApp } from "../../packages/server/src/app";

/** 클라이언트 `HttpGitService`를 진짜 서버(진짜 git 저장소)에 대고 계약 스위트를 돈다. */
const roots: string[] = [];
const closers: (() => void)[] = [];
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

afterAll(async () => {
  for (const close of closers) close();
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

testGitServiceContract("HttpGitService → server", async () => {
  const workspaceRoot = realpathSync(await mkdtemp(path.join(os.tmpdir(), "ade-git-contract-")));
  roots.push(workspaceRoot);
  const git = (...args: string[]) => execFileSync("git", ["-C", workspaceRoot, ...args], { stdio: "pipe" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  await writeFile(path.join(workspaceRoot, "a.txt"), "one\n");
  git("add", "a.txt");
  git("commit", "-q", "-m", "init");

  const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };
  const { app, close } = createApp({
    config: { workspaceRoot, port: 0, host: "127.0.0.1", clientRoot: undefined, dataDir: ":memory:", anthropic: undefined },
    log: silent,
    startedAt: "2026-09-09T00:00:00.000Z",
  });
  closers.push(close);
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) =>
    app.request(typeof input === "string" ? input : input.toString(), init)) as typeof fetch;
  return {
    service: createGitServicePort(),
    write: (relative, content) => writeFile(path.join(workspaceRoot, relative), content),
  };
});
