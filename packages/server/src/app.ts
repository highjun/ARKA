import { Hono } from "hono";
import type { Logger } from "./core/log";
import type { ServerConfig } from "./core/config";
import { serializeError } from "./core/log";
import { createFsRoutes, createWatchRoutes } from "./features/filesystem";
import { createStaticRoutes } from "./features/static";

/**
 * 조립은 여기 한 곳이다. 이 파일만 읽으면 어떤 라우트가 도는지 다 보인다 — 클라이언트의
 * `workbench/registerServices.tsx`와 같은 자리다. 부팅(포트 열기·시그널)은 `index.ts`가 한다.
 *
 * `serve()` 없이 `app.request()`로 통째로 테스트할 수 있게 `Hono`를 돌려준다.
 */
export const createApp = ({ config, log, startedAt }: { config: ServerConfig; log: Logger; startedAt: string }): Hono => {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  // 클라이언트가 지금 서빙 중인 번들이 언제 것인지 표시하는 데만 쓴다 — 실패해도 화면은 돈다.
  app.get("/api/version", (c) => c.json({ builtAt: startedAt }));

  app.route("/", createWatchRoutes(config.workspaceRoot));
  app.route("/", createFsRoutes(config.workspaceRoot));

  // 정적 서빙은 마지막이다 — SPA fallback이 확장자 없는 경로를 전부 index.html로 되돌리므로
  // API 라우트보다 먼저 붙으면 `/api/*`까지 삼킨다.
  if (config.clientRoot !== undefined) {
    app.route("/", createStaticRoutes(config.clientRoot));
  }

  // 어느 feature도 받지 않은 오류의 마지막 자리. 메시지를 밖에 내지 않는다 — 스택이나 경로가
  // 실리면 서버가 어디에 뿌리내렸는지가 응답으로 샌다. 사유는 로그에만 남긴다.
  app.onError((error, c) => {
    log.error("request.failed", { method: c.req.method, path: c.req.path, error: serializeError(error) });
    return c.json({ code: "Internal", message: "internal error" }, 500);
  });

  return app;
};
