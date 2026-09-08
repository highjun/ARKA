import { realpathSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HealthResponse, PROTOCOL_HEADER, PROTOCOL_VERSION, VersionResponse } from "contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { LogFields, Logger } from "./core/log";

let workspaceRoot: string;
/** 프로토콜 헤더를 실은 요청. 실제 클라이언트가 보내는 것과 같다. */
const withProtocol = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...(init.headers as Record<string, string> | undefined), [PROTOCOL_HEADER]: String(PROTOCOL_VERSION) },
});
const logged: { event: string; fields: LogFields | undefined }[] = [];
const log: Logger = {
  info: (event, fields) => logged.push({ event, fields }),
  warn: (event, fields) => logged.push({ event, fields }),
  error: (event, fields) => logged.push({ event, fields }),
};

const buildApp = () =>
  createApp({
    config: { workspaceRoot, port: 0, host: "127.0.0.1", clientRoot: undefined, dataDir: ":memory:", anthropic: undefined },
    log,
    startedAt: "2026-09-09T00:00:00.000Z",
  }).app;

beforeAll(async () => {
  workspaceRoot = realpathSync(await mkdtemp(path.join(os.tmpdir(), "ade-app-")));
  await writeFile(path.join(workspaceRoot, "a.txt"), "hello");
});

afterAll(async () => {
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe("createApp", () => {
  it("/api/health는 계약대로 답한다", async () => {
    const response = await buildApp().request("/api/health");
    expect(response.status).toBe(200);
    expect(HealthResponse.parse(await response.json())).toEqual({ status: "ok" });
  });

  it("/api/version은 시작 시각과 프로토콜 버전을 헤더 없이도 준다", async () => {
    const response = await buildApp().request("/api/version");
    expect(VersionResponse.parse(await response.json())).toEqual({ builtAt: "2026-09-09T00:00:00.000Z", protocolVersion: PROTOCOL_VERSION });
  });

  it("프로토콜 헤더가 없는 /api/* 요청은 426이다", async () => {
    const response = await buildApp().request("/api/files?path=");
    expect(response.status).toBe(426);
    expect(await response.json()).toMatchObject({ code: "VersionMismatch", supported: [PROTOCOL_VERSION] });
  });

  it("지원하지 않는 프로토콜 버전은 426이다", async () => {
    const response = await buildApp().request("/api/files?path=", { headers: { [PROTOCOL_HEADER]: "999" } });
    expect(response.status).toBe(426);
  });

  it("파일 라우트가 붙어 있다", async () => {
    const response = await buildApp().request("/api/files/content?path=a.txt", withProtocol());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ content: "hello" });
  });

  it("/api/git/status는 저장소가 아니면 repository: false", async () => {
    const response = await buildApp().request("/api/git/status", withProtocol());
    expect(await response.json()).toEqual({ repository: false, branch: null, files: [] });
    const commit = await buildApp().request("/api/git/commit", json({ message: "x" }));
    expect(commit.status).toBe(404);
    expect(await commit.json()).toMatchObject({ code: "NotARepository" });
  });

  it("/api/search가 워크스페이스를 찾는다", async () => {
    const response = await buildApp().request("/api/search?query=hel&caseSensitive=false", withProtocol());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matches: [{ path: "a.txt", line: 1, column: 1, preview: "hello" }], truncated: false });
    const bad = await buildApp().request("/api/search?query=", withProtocol());
    expect(bad.status).toBe(400);
  });

  it("옮기기 목적지가 이미 있으면 409이고 덮어쓰지 않는다", async () => {
    await writeFile(path.join(workspaceRoot, "b.txt"), "keep");
    const app = buildApp();
    const response = await app.request(
      "/api/files/move",
      withProtocol({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: "a.txt", to: "b.txt" }),
      }),
    );
    expect(response.status).toBe(409);
    expect(await readFile(path.join(workspaceRoot, "b.txt"), "utf8")).toBe("keep");
  });

  it("루트 밖 감시 요청은 500이 아니라 403 파일 오류다", async () => {
    const response = await buildApp().request("/api/files/watch?path=../", withProtocol());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "NoPermission" });
  });

  it("정체 모를 오류는 500이고 메시지를 밖에 내지 않는다", async () => {
    const app = buildApp();
    app.get("/boom", () => {
      throw new Error("secret path /home/someone");
    });
    logged.length = 0;

    const response = await app.request("/boom");
    expect(response.status).toBe(500);
    const body = (await response.json()) as { code: string; message: string };
    expect(body).toEqual({ code: "Internal", message: "internal error" });
    expect(logged[0]?.event).toBe("request.failed");
    expect(JSON.stringify(logged[0]?.fields)).toContain("secret path");
  });

  it("정적 서빙이 꺼져 있으면 알 수 없는 경로는 404다", async () => {
    const response = await buildApp().request("/anything");
    expect(response.status).toBe(404);
  });
});

/** SSE 응답에서 `data:` 프레임을 `count`개 읽고 끊는다. */
const readFrames = async (response: Response, count: number): Promise<unknown[]> => {
  const reader = response.body?.getReader();
  if (reader === undefined) throw new Error("no body");
  const decoder = new TextDecoder();
  let buffer = "";
  const frames: unknown[] = [];
  while (frames.length < count) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = frame.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("");
      if (data !== "") frames.push(JSON.parse(data));
      boundary = buffer.indexOf("\n\n");
    }
  }
  await reader.cancel();
  return frames;
};

const json = (body: unknown, method = "POST"): RequestInit =>
  withProtocol({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("에이전트 라우트", () => {
  it("세션을 만들고 목록에서 본다", async () => {
    const app = buildApp();
    const created = await app.request("/api/agent/sessions", json({ title: "첫 세션" }));
    expect(created.status).toBe(201);
    const { session } = (await created.json()) as { session: { id: string; title: string } };
    const list = await app.request("/api/agent/sessions", withProtocol());
    expect(await list.json()).toMatchObject({ sessions: [{ id: session.id, title: "첫 세션" }] });
  });

  it("없는 세션은 404 SessionNotFound", async () => {
    const response = await buildApp().request("/api/agent/sessions/nope", withProtocol());
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "SessionNotFound" });
  });

  it("Run을 시작하면 202이고, 이벤트 스트림이 시작부터 흘러온다", async () => {
    const app = buildApp();
    const created = await app.request("/api/agent/sessions", json({}));
    const { session } = (await created.json()) as { session: { id: string } };

    const started = await app.request(`/api/agent/sessions/${session.id}/runs`, json({ input: "안녕" }));
    expect(started.status).toBe(202);
    expect(await started.json()).toMatchObject({ status: "running" });

    const stream = await app.request(`/api/agent/sessions/${session.id}/events?since=0`, withProtocol());
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const frames = await readFrames(stream, 3);
    expect(frames.map((f) => (f as { type: string }).type)).toEqual(["session.renamed", "run.started", "thinking.delta"]);
  });

  it("도는 Run이 있으면 409 RunInProgress", async () => {
    const app = buildApp();
    const created = await app.request("/api/agent/sessions", json({}));
    const { session } = (await created.json()) as { session: { id: string } };
    await app.request(`/api/agent/sessions/${session.id}/runs`, json({ input: "a" }));
    const second = await app.request(`/api/agent/sessions/${session.id}/runs`, json({ input: "b" }));
    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({ code: "RunInProgress" });
  });

  it("since로 이어 받는다 — 이미 본 seq는 다시 오지 않는다", async () => {
    const app = buildApp();
    const created = await app.request("/api/agent/sessions", json({ title: "t" }));
    const { session } = (await created.json()) as { session: { id: string } };
    await app.request(`/api/agent/sessions/${session.id}`, json({ title: "1" }, "PATCH"));
    await app.request(`/api/agent/sessions/${session.id}`, json({ title: "2" }, "PATCH"));
    const stream = await app.request(`/api/agent/sessions/${session.id}/events?since=1`, withProtocol());
    const frames = await readFrames(stream, 1);
    expect(frames[0]).toMatchObject({ seq: 2, type: "session.renamed", title: "2" });
  });
});
