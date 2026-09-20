import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { ConfigError, loadConfig } from "./core/config";
import { createStdoutLogger, serializeError } from "./core/log";

const SHUTDOWN_GRACE_MS = 5_000;

const log = createStdoutLogger();

const main = async (): Promise<void> => {
  const config = await loadConfig();
  const startedAt = new Date().toISOString();
  const { app } = createApp({ config, log, startedAt });

  const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
    log.info("server.started", { host: info.address, port: info.port, workspace: config.workspaceRoot });
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info("server.stopping", { signal });
    server.close(() => {
      log.info("server.stopped");
      process.exit(0);
    });
    setTimeout(() => {
      if ("closeAllConnections" in server) server.closeAllConnections();
    }, SHUTDOWN_GRACE_MS).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

process.on("unhandledRejection", (reason) => {
  log.error("process.unhandledRejection", { error: serializeError(reason) });
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  log.error("process.uncaughtException", { error: serializeError(error) });
  process.exit(1);
});

main().catch((error: unknown) => {
  if (error instanceof ConfigError) {
    log.error("config.invalid", { message: error.message });
  } else {
    log.error("server.failed", { error: serializeError(error) });
  }
  process.exit(1);
});
