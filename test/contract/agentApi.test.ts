import { realpathSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach } from "vitest";
import { createAgentApiPort } from "../../packages/client/src/extensions/agent/infra/HttpAgentApi";
import { createAgentEventsPort } from "../../packages/client/src/extensions/agent/infra/SseAgentEvents";
import { testAgentApiContract } from "../../packages/client/src/extensions/agent/model/agentApi.contract";
import { createApp } from "../../packages/server/src/app";

/**
 * 클라이언트의 HttpAgentApi + SseAgentEvents를 **진짜 서버 앱**(메모리 SQLite, 스크립트 실행기)에 대고
 * 계약 스위트를 돈다. SSE까지 `app.request`의 스트리밍 Response로 실물이다.
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

testAgentApiContract("HttpAgentApi + SseAgentEvents → server", async () => {
  const workspaceRoot = realpathSync(await mkdtemp(path.join(os.tmpdir(), "ade-agent-contract-")));
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
  const api = createAgentApiPort();
  const events = createAgentEventsPort();
  // 클래스 인스턴스는 펼치면 프로토타입 메서드를 잃는다 — 하나씩 묶는다.
  return {
    listSessions: () => api.listSessions(),
    createSession: (title?: string) => api.createSession(title),
    updateSession: (id: string, patch: { readonly title?: string; readonly archived?: boolean }) => api.updateSession(id, patch),
    startRun: (sessionId: string, input: string, mode: "action" | "plan") => api.startRun(sessionId, input, mode),
    provideInput: (sessionId: string, runId: string, requestId: string, text: string) => api.provideInput(sessionId, runId, requestId, text),
    cancelRun: (sessionId: string, runId: string) => api.cancelRun(sessionId, runId),
    subscribe: (sessionId: string, since: number, onEvent: Parameters<typeof events.subscribe>[2]) => events.subscribe(sessionId, since, onEvent),
  };
});
