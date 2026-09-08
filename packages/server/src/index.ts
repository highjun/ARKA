import { serve } from "@hono/node-server";
import { portFromEnv, workspaceRootFromEnv } from "./core/config";
import { createFsRoutes } from "./features/filesystem";

const workspaceRoot = workspaceRootFromEnv();
const port = portFromEnv();

serve({ fetch: createFsRoutes(workspaceRoot).fetch, port });

// 어느 디렉터리를 열었는지 모르면 경로 문제를 추적할 수 없다.
console.log(`ADE server on :${port} — workspace ${workspaceRoot}`);
