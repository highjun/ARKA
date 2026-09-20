import type { WatchEvent } from "#contracts";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { FileError } from "../domain/errors";
import { MAX_WATCH_PATHS, resolveWatchPaths, watchPaths } from "../infra/watchOperations";
import { fileErrorResponse } from "./fileErrorHandler";

const HEARTBEAT_MS = 15_000;

export function createWatchRoutes(workspaceRoot: string): Hono {
  const app = new Hono();

  app.get("/api/files/watch", async (c) => {
    const requested = c.req.queries("path") ?? [];
    if (requested.length === 0 || requested.length > MAX_WATCH_PATHS) {
      return c.json({ code: "BadRequest", message: `path must be given 1~${String(MAX_WATCH_PATHS)} times` }, 400);
    }

    const resolved = await resolveWatchPaths(workspaceRoot, requested);
    if (resolved === null) {
      throw new FileError("NoPermission", "forbidden");
    }

    return streamSSE(c, async (stream) => {
      const send = (paths: readonly string[]): void => {
        const event: WatchEvent = { paths: [...paths] };
        void stream.writeSSE({ data: JSON.stringify(event) });
      };

      const handle = watchPaths(workspaceRoot, resolved, send);
      const heartbeat = setInterval(() => send([]), HEARTBEAT_MS);

      stream.onAbort(() => {
        clearInterval(heartbeat);
        handle.close();
      });

      await new Promise<void>((resolve) => stream.onAbort(resolve));
    });
  });

  app.onError((error, c) => {
    const response = fileErrorResponse(error, c);
    if (response === undefined) throw error;
    return response;
  });

  return app;
}
