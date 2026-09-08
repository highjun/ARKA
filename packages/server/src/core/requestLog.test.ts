import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { LogFields } from "./log";
import { createRequestLog } from "./requestLog";

const capture = () => {
  const lines: { level: string; event: string; fields: LogFields | undefined }[] = [];
  const log = {
    info: (event: string, fields?: LogFields) => lines.push({ level: "info", event, fields }),
    warn: (event: string, fields?: LogFields) => lines.push({ level: "warn", event, fields }),
    error: (event: string, fields?: LogFields) => lines.push({ level: "error", event, fields }),
  };
  const app = new Hono();
  app.use("*", createRequestLog(log));
  app.get("/ok", (c) => c.text("ok"));
  app.get("/missing", (c) => c.json({}, 404));
  app.get("/boom", (c) => c.json({}, 500));
  app.get("/api/health", (c) => c.json({ status: "ok" }));
  return { app, lines };
};

describe("createRequestLog", () => {
  it("요청마다 method·path·status·ms를 한 줄 남긴다", async () => {
    const { app, lines } = capture();
    await app.request("/ok");
    expect(lines[0]).toMatchObject({ level: "info", event: "request", fields: { method: "GET", path: "/ok", status: 200 } });
    expect(typeof lines[0]?.fields?.["ms"]).toBe("number");
  });

  it("4xx는 warn, 5xx는 error다", async () => {
    const { app, lines } = capture();
    await app.request("/missing");
    await app.request("/boom");
    expect(lines.map((l) => l.level)).toEqual(["warn", "error"]);
  });

  it("헬스체크는 남기지 않는다", async () => {
    const { app, lines } = capture();
    await app.request("/api/health");
    expect(lines).toEqual([]);
  });
});
