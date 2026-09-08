import path from "node:path";
import type { Hono } from "hono";
import type { Logger } from "../../core/log";
import { openDatabase } from "./infra/database";
import { ScriptedRunner } from "./infra/ScriptedRunner";
import { SqliteEventStore } from "./infra/SqliteEventStore";
import { SqliteSessionStore } from "./infra/SqliteSessionStore";
import { RunManager } from "./runtime/RunManager";
import { createAgentRoutes } from "./transport/agentRoutes";

export type AgentFeature = {
  readonly routes: Hono;
  /** 도는 Run을 끊고 DB를 닫는다. 프로세스가 내려갈 때 부른다. */
  close(): void;
};

/**
 * 에이전트 feature의 조립. 어느 저장소·실행기가 꽂히는지는 여기만 안다(→ ADR 0007).
 *
 * `dataDir`가 `":memory:"`면 메모리 DB다 — 테스트용.
 */
export const createAgentFeature = ({ dataDir, log }: { dataDir: string; log: Logger }): AgentFeature => {
  const db = openDatabase(dataDir === ":memory:" ? dataDir : path.join(dataDir, "data.db"));
  const events = new SqliteEventStore(db);
  const sessions = new SqliteSessionStore(db);
  // 실제 LLM 실행기는 키가 있을 때 붙인다(→ ADR 0019). 그 전까지는 스크립트 실행기다.
  const runner = new ScriptedRunner();
  const runManager = new RunManager({ events, sessions, runner, log });
  return {
    routes: createAgentRoutes({ runManager, events }),
    close: () => {
      runManager.cancelAll();
      db.close();
    },
  };
};
