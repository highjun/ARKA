import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { FileError } from "../domain/errors";
import { MAX_WATCH_PATHS, resolveWatchPaths, watchPaths } from "../infra/watchOperations";
import { fileErrorResponse } from "./fileErrorHandler";

/**
 * 폰 브라우저·중간 프록시가 조용한 연결을 끊는다. 클라이언트의 idle-timeout(45s)이 이
 * 간격의 3배 여유를 두고 짝을 맞춘다.
 *
 * `paths: []`를 하트비트로 재사용한다 — 실제 변경 알림은 항상 하나 이상을 담으므로 겹치지
 * 않는다.
 */
const HEARTBEAT_MS = 15_000;

export function createWatchRoutes(workspaceRoot: string): Hono {
  const app = new Hono();

  app.get("/api/files/watch", async (c) => {
    const requested = c.req.queries("path") ?? [];
    if (requested.length === 0 || requested.length > MAX_WATCH_PATHS) {
      return c.json(
        { code: "BadRequest", message: `path must be given 1~${String(MAX_WATCH_PATHS)} times` },
        400,
      );
    }

    const resolved = await resolveWatchPaths(workspaceRoot, requested);
    if (resolved === null) {
      throw new FileError("NoPermission", "forbidden");
    }

    return streamSSE(c, async (stream) => {
      const send = (paths: readonly string[]): void => {
        void stream.writeSSE({ data: JSON.stringify({ paths }) });
      };

      const handle = watchPaths(workspaceRoot, resolved, send);
      const heartbeat = setInterval(() => send([]), HEARTBEAT_MS);

      // 연결이 끊기면 감시와 하트비트를 함께 정리한다 — 둘 중 하나만 남으면 파일 핸들이나
      // 타이머가 샌다.
      stream.onAbort(() => {
        clearInterval(heartbeat);
        handle.close();
      });

      // 스트림은 클라이언트가 끊을 때까지 열어 둔다.
      await new Promise<void>((resolve) => stream.onAbort(resolve));
    });
  });

  // `fsRoutes`와 같은 번역기를 건다 — 루트 밖 감시 요청이 500이 아니라 403으로 나가게.
  app.onError((error, c) => {
    const response = fileErrorResponse(error, c);
    if (response === undefined) throw error;
    return response;
  });

  return app;
}
