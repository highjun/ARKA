import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { ConfigError, loadConfig } from "./core/config";
import { createStdoutLogger, serializeError } from "./core/log";

/** 시그널을 받고 이 시간 안에 연결이 안 닫히면 강제로 끊는다. SSE는 스스로 끝나지 않는다. */
const SHUTDOWN_GRACE_MS = 5_000;

const log = createStdoutLogger();

const main = async (): Promise<void> => {
  const config = await loadConfig();
  const startedAt = new Date().toISOString();
  const app = createApp({ config, log, startedAt });

  const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
    // 어느 디렉터리를 열었는지 모르면 경로 문제를 추적할 수 없다.
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
    // `close()`는 열린 연결이 끝나길 기다린다. 감시 스트림은 끝나지 않으므로 유예 뒤 끊는다.
    setTimeout(() => {
      // HTTP/2 서버 타입에는 없는 메서드라 좁힌다 — 우리는 HTTP/1이지만 `serve()`의 반환 타입이 합집합이다.
      if ("closeAllConnections" in server) server.closeAllConnections();
    }, SHUTDOWN_GRACE_MS).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

// 잡히지 않은 오류는 프로세스를 끝낸다 — 상태를 모르는 채로 계속 도는 것보다 감독자가
// 다시 띄우는 편이 낫다.
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
