import { realpathSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach } from "vitest";
import { createWorkspaceFilesPort } from "../../packages/client/src/extensions/filesystem/infra/HttpWorkspaceFiles";
import { testWorkspaceFilesContract } from "../../packages/client/src/extensions/filesystem/model/workspaceFiles.contract";
import { createApp } from "../../packages/server/src/app";

/**
 * 클라이언트의 `HttpWorkspaceFiles`를 **진짜 서버 앱**에 대고 계약 스위트를 돈다 — `fetch`만 Hono의
 * `app.request`로 바꿔 끼운다. 네트워크 없이 HTTP 직렬화·상태 코드·경로 방어까지 실물 그대로다.
 *
 * Mock이 통과하는 스위트를 실물도 통과해야 Mock 위의 테스트를 믿을 수 있다.
 */
const roots: string[] = [];
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

afterAll(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

testWorkspaceFilesContract("HttpWorkspaceFiles → server", async () => {
  const workspaceRoot = realpathSync(await mkdtemp(path.join(os.tmpdir(), "ade-contract-")));
  roots.push(workspaceRoot);
  const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };
  const app = createApp({
    config: { workspaceRoot, port: 0, host: "127.0.0.1", clientRoot: undefined },
    log: silent,
    startedAt: "2026-09-09T00:00:00.000Z",
  });
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) =>
    app.request(typeof input === "string" ? input : input.toString(), init)) as typeof fetch;
  return createWorkspaceFilesPort();
});
