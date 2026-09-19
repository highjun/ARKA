import { realpathSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HealthResponse, PROTOCOL_HEADER, PROTOCOL_VERSION, VersionResponse } from "#contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { makeConfig } from "./core/config.testing";
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
    config: makeConfig({ workspaceRoot }),
    log,
    startedAt: "2026-09-09T00:00:00.000Z",
  }).app;

describe("createApp", () => {
  beforeAll(async () => {
    workspaceRoot = realpathSync(await mkdtemp(path.join(os.tmpdir(), "arka-app-")));
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

    it("/api/version은 이미지가 구운 커밋 SHA를 준다 — 무엇이 떠 있는지 묻는 유일한 길이다", async () => {
      const app = createApp({
        config: makeConfig({ workspaceRoot, gitSha: "abc1234-dirty" }),
        log,
        startedAt: "2026-09-09T00:00:00.000Z",
      }).app;

      const body = VersionResponse.parse(await (await app.request("/api/version")).json());

      expect(body.gitSha).toBe("abc1234-dirty");
    });

    it("/api/version은 시작 시각·프로토콜 버전·헤더 이름·워크스페이스 이름을 헤더 없이도 준다", async () => {
      const response = await buildApp().request("/api/version");
      expect(VersionResponse.parse(await response.json())).toEqual({
        builtAt: "2026-09-09T00:00:00.000Z",
        protocolVersion: PROTOCOL_VERSION,
        protocolHeader: PROTOCOL_HEADER,
        workspaceName: path.basename(workspaceRoot),
      });
    });

    it("요청 로그에 사용자가 실린다 — 기본은 local, Access 헤더가 있으면 그 이메일", async () => {
      const app = buildApp();
      logged.length = 0;
      await app.request("/api/version");
      expect(logged.at(-1)?.fields).toMatchObject({ user: "local" });
      await app.request("/api/version", { headers: { "cf-access-authenticated-user-email": "me@example.com" } });
      expect(logged.at(-1)?.fields).toMatchObject({ user: "me@example.com" });
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
});
