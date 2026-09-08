import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { Hono } from "hono";
import type { Logger } from "../../core/log";
import type { IAgentRunner } from "./domain/IAgentRunner";
import { AnthropicRunner } from "./infra/AnthropicRunner";
import { openDatabase } from "./infra/database";
import { ScriptedRunner } from "./infra/ScriptedRunner";
import { createWorkspaceTools, type WorkspaceAccess } from "./infra/workspaceTools";
import { SqliteEventStore } from "./infra/SqliteEventStore";
import { SqliteSessionStore } from "./infra/SqliteSessionStore";
import { RunManager } from "./runtime/RunManager";
import { createAgentRoutes } from "./transport/agentRoutes";

export type AgentFeature = {
  readonly routes: Hono;
  /** 도는 Run을 끊고 DB를 닫는다. 프로세스가 내려갈 때 부른다. */
  close(): void;
};

export type AgentFeatureOptions = {
  readonly dataDir: string;
  readonly log: Logger;
  /** 워크스페이스 유스케이스 — 툴이 이것으로 파일을 다룬다. 조립부가 filesystem feature에서 가져온다. */
  readonly workspace: WorkspaceAccess;
  /** 없으면 스크립트 실행기다(→ ADR 0019). */
  readonly anthropic?: { readonly apiKey: string; readonly model: string };
};

/**
 * 에이전트 feature의 조립. 어느 저장소·실행기가 꽂히는지는 여기만 안다(→ ADR 0007).
 *
 * `dataDir`가 `":memory:"`면 메모리 DB다 — 테스트용.
 */
export const createAgentFeature = ({ dataDir, log, workspace, anthropic }: AgentFeatureOptions): AgentFeature => {
  const db = openDatabase(dataDir === ":memory:" ? dataDir : path.join(dataDir, "data.db"));
  const events = new SqliteEventStore(db);
  const sessions = new SqliteSessionStore(db);
  const runner: IAgentRunner =
    anthropic === undefined
      ? new ScriptedRunner()
      : new AnthropicRunner({ client: new Anthropic({ apiKey: anthropic.apiKey }), model: anthropic.model, tools: createWorkspaceTools(workspace) });
  log.info("agent.runner", { kind: anthropic === undefined ? "scripted" : "anthropic", model: anthropic?.model ?? null });
  const runManager = new RunManager({ events, sessions, runner, log });
  return {
    routes: createAgentRoutes({ runManager, events }),
    close: () => {
      runManager.cancelAll();
      db.close();
    },
  };
};
