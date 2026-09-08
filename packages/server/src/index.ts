import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { portFromEnv, workspaceRootFromEnv } from "./core/config";
import { createFsRoutes, createWatchRoutes } from "./features/filesystem";

const workspaceRoot = workspaceRootFromEnv();
const port = portFromEnv();
const startedAt = new Date().toISOString();

const app = new Hono();

// 클라이언트가 지금 서빙 중인 번들이 언제 것인지 표시하는 데만 쓴다 — 실패해도 화면은 돈다.
app.get("/api/version", (c) => c.json({ builtAt: startedAt }));

app.route("/", createWatchRoutes(workspaceRoot));
app.route("/", createFsRoutes(workspaceRoot));

serve({ fetch: app.fetch, port });

// 어느 디렉터리를 열었는지 모르면 경로 문제를 추적할 수 없다.
console.log(`ADE server on :${port} — workspace ${workspaceRoot}`);
