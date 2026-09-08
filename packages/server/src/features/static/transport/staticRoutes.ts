import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import {
  KILL_SWITCH_SW,
  cacheControlFor,
  contentTypeFor,
  pickFile,
} from "../infra/staticFiles";

/**
 * 빌드된 클라이언트를 서빙한다. API 라우트 **뒤에** 붙여야 한다 — 확장자 없는 경로를
 * `index.html`로 되돌리는 SPA fallback이 `/api/*`까지 삼키면 안 된다.
 */
export function createStaticRoutes(clientRoot: string): Hono {
  const app = new Hono();

  // 옛 Service Worker를 걷어낸다. 배포를 내리는 것으로는 회수되지 않아 서버가 대신 내려준다.
  app.get("/sw.js", (c) => {
    c.header("content-type", "application/javascript; charset=utf-8");
    c.header("cache-control", "no-store");
    return c.body(KILL_SWITCH_SW);
  });

  app.get("/*", async (c) => {
    const picked = pickFile(clientRoot, c.req.path);
    if (picked === undefined) {
      return c.notFound();
    }

    const body = await readFile(picked.filePath);
    c.header("content-type", contentTypeFor(picked.filePath));
    c.header("cache-control", cacheControlFor(picked.relativePath));
    return c.body(new Uint8Array(body));
  });

  return app;
}
