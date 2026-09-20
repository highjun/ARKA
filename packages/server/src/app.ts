import { PROTOCOL_HEADER, PROTOCOL_VERSION } from "#contracts";
import { Hono } from "hono";
import type { Logger } from "./core/log";
import type { ServerConfig } from "./core/config";
import { serializeError } from "./core/log";
import { createProtocolGuard } from "./core/protocol";
import { type AppVariables, createRequestContext } from "./core/requestContext";
import { createRequestLog } from "./core/requestLog";
import { createWorkspace } from "./core/workspace";
import { createFsRoutes, createWatchRoutes } from "./features/filesystem";
import { createStaticRoutes } from "./features/static";

export type Application = {
  readonly app: Hono<{ Variables: AppVariables }>;
};

export const createApp = ({
  config,
  log,
  startedAt,
}: {
  config: ServerConfig;
  log: Logger;
  startedAt: string;
}): Application => {
  const app = new Hono<{ Variables: AppVariables }>();
  const workspace = createWorkspace(config.workspaceRoot);

  app.use("*", createRequestContext());
  app.use("*", createRequestLog(log));

  app.get("/api/health", (c) => c.json({ status: "ok" }));
  app.get("/api/version", (c) =>
    c.json({
      builtAt: startedAt,
      protocolVersion: PROTOCOL_VERSION,
      protocolHeader: PROTOCOL_HEADER,
      workspaceName: workspace.name,
      gitSha: config.gitSha,
    }),
  );

  app.use("/api/*", createProtocolGuard([PROTOCOL_VERSION]));

  app.route("/", createWatchRoutes(workspace.root));
  app.route("/", createFsRoutes(workspace.root));

  if (config.clientRoot !== undefined) {
    app.route("/", createStaticRoutes(config.clientRoot));
  }

  app.onError((error, c) => {
    log.error("request.failed", { method: c.req.method, path: c.req.path, error: serializeError(error) });
    return c.json({ code: "Internal", message: "internal error" }, 500);
  });

  return { app };
};
