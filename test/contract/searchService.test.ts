import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach } from "vitest";
import { createSearchServicePort } from "../../packages/client/src/extensions/search/infra/HttpSearchService";
import { testSearchServiceContract } from "../../packages/client/src/extensions/search/model/searchService.contract";
import { createApp } from "../../packages/server/src/app";

/** 클라이언트 `HttpSearchService`를 진짜 서버(진짜 디스크)에 대고 계약 스위트를 돈다. */
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

testSearchServiceContract("HttpSearchService → server", async () => {
  const workspaceRoot = realpathSync(await mkdtemp(path.join(os.tmpdir(), "ade-search-contract-")));
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
  return {
    service: createSearchServicePort(),
    seed: async (files) => {
      for (const [relative, content] of Object.entries(files)) {
        const absolute = path.join(workspaceRoot, relative);
        await mkdir(path.dirname(absolute), { recursive: true });
        await writeFile(absolute, content);
      }
    },
  };
});
