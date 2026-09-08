import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach } from "vitest";
import { createWorkspaceWatchPort } from "../../packages/client/src/extensions/filesystem/infra/HttpWorkspaceWatch";
import { testWorkspaceWatchContract } from "../../packages/client/src/extensions/filesystem/model/workspaceWatch.contract";
import { createApp } from "../../packages/server/src/app";

/**
 * 클라이언트의 `HttpWorkspaceWatch`를 진짜 서버 SSE(진짜 `fs.watch`)에 대고 계약 스위트를 돈다.
 * 파일을 실제 디스크에 쓴다 — inotify가 실제로 도는지가 이 스위트의 값이다.
 */
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

testWorkspaceWatchContract("HttpWorkspaceWatch → server", async () => {
  const workspaceRoot = realpathSync(await mkdtemp(path.join(os.tmpdir(), "ade-watch-contract-")));
  roots.push(workspaceRoot);
  const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };
  const { app, close } = createApp({
    config: { workspaceRoot, port: 0, host: "127.0.0.1", clientRoot: undefined, dataDir: ":memory:", anthropic: undefined },
    log: silent,
    startedAt: "2026-09-09T00:00:00.000Z",
  });
  closers.push(close);
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) =>
    app.request(typeof input === "string" ? input : input.toString(), init)) as typeof fetch;
  // `HttpWorkspaceWatch`가 포그라운드 복귀를 `document`로 듣는다 — Node에는 없으니 최소한만 둔다.
  if (!("document" in globalThis)) {
    Object.assign(globalThis, { document: { visibilityState: "visible", addEventListener: () => undefined, removeEventListener: () => undefined } });
  }
  let counter = 0;
  return {
    watch: createWorkspaceWatchPort(),
    change: async (dir) => {
      counter += 1;
      await writeFile(path.join(workspaceRoot, dir, `change-${String(counter)}.txt`), "x");
    },
    mkdir: async (dir) => {
      await mkdir(path.join(workspaceRoot, dir), { recursive: true });
    },
  };
});
