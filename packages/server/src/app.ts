import { PROTOCOL_VERSION } from "contracts";
import { Hono } from "hono";
import type { Logger } from "./core/log";
import type { ServerConfig } from "./core/config";
import { serializeError } from "./core/log";
import { createProtocolGuard } from "./core/protocol";
import { createAgentFeature } from "./features/agent";
import { createFsRoutes, createWatchRoutes } from "./features/filesystem";
import { createStaticRoutes } from "./features/static";

export type Application = {
  readonly app: Hono;
  /** 장기 실행 자원(Run·DB)을 정리한다. 종료 경로에서 부른다. */
  close(): void;
};

/**
 * 조립은 여기 한 곳이다. 이 파일만 읽으면 어떤 라우트가 도는지 다 보인다 — 클라이언트의
 * `workbench/registerServices.tsx`와 같은 자리다. 부팅(포트 열기·시그널)은 `index.ts`가 한다.
 *
 * `serve()` 없이 `app.request()`로 통째로 테스트할 수 있게 `Hono`를 돌려준다.
 */
export const createApp = ({ config, log, startedAt }: { config: ServerConfig; log: Logger; startedAt: string }): Application => {
  const app = new Hono();
  const agent = createAgentFeature({ dataDir: config.dataDir, log });

  // 아래 둘은 프로토콜 헤더 없이 부를 수 있다 — 낡은 클라이언트도 자기가 낡았다는 것을 알아야 한다.
  app.get("/api/health", (c) => c.json({ status: "ok" }));
  app.get("/api/version", (c) => c.json({ builtAt: startedAt, protocolVersion: PROTOCOL_VERSION }));

  // 그 밖의 /api/*는 헤더가 맞아야 통과한다. 등록 순서가 곧 적용 범위다(→ core/protocol.ts).
  app.use("/api/*", createProtocolGuard([PROTOCOL_VERSION]));

  app.route("/", createWatchRoutes(config.workspaceRoot));
  app.route("/", createFsRoutes(config.workspaceRoot));
  app.route("/", agent.routes);

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

  return { app, close: () => agent.close() };
};
