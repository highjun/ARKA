import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { KILL_SWITCH_SW, cacheControlFor, contentTypeFor, pickFile } from "../infra/staticFiles";

export function createStaticRoutes(clientRoot: string): Hono {
  const app = new Hono();

  app.get("/sw.js", (c) => {
    c.header("content-type", "text/javascript; charset=utf-8");
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
