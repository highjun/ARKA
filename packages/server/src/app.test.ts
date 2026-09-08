import { realpathSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HealthResponse } from "contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { LogFields, Logger } from "./core/log";

let workspaceRoot: string;
const logged: { event: string; fields: LogFields | undefined }[] = [];
const log: Logger = {
  info: (event, fields) => logged.push({ event, fields }),
  warn: (event, fields) => logged.push({ event, fields }),
  error: (event, fields) => logged.push({ event, fields }),
};

const buildApp = () =>
  createApp({
    config: { workspaceRoot, port: 0, host: "127.0.0.1", clientRoot: undefined },
    log,
    startedAt: "2026-09-09T00:00:00.000Z",
  });

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

  it("/api/version은 시작 시각을 준다", async () => {
    const response = await buildApp().request("/api/version");
    expect(await response.json()).toEqual({ builtAt: "2026-09-09T00:00:00.000Z" });
  });

  it("파일 라우트가 붙어 있다", async () => {
    const response = await buildApp().request("/api/files/content?path=a.txt");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ content: "hello" });
  });

  it("옮기기 목적지가 이미 있으면 409이고 덮어쓰지 않는다", async () => {
    await writeFile(path.join(workspaceRoot, "b.txt"), "keep");
    const app = buildApp();
    const response = await app.request("/api/files/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from: "a.txt", to: "b.txt" }),
    });
    expect(response.status).toBe(409);
    expect(await readFile(path.join(workspaceRoot, "b.txt"), "utf8")).toBe("keep");
  });

  it("루트 밖 감시 요청은 500이 아니라 403 파일 오류다", async () => {
    const response = await buildApp().request("/api/files/watch?path=../");
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
