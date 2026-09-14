import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { Hono } from "hono";
import type { Logger } from "../../core/log";
import type { AgentConfig } from "./config";
import type { IAgentRunner } from "./domain/IAgentRunner";
import { AnthropicRunner } from "./infra/AnthropicRunner";
import { openDatabase } from "./infra/database";
import { ScriptedRunner } from "./infra/ScriptedRunner";
import { createWorkspaceTools, type WorkspaceAccess } from "./infra/workspaceTools";
import { SqliteEventStore } from "./infra/SqliteEventStore";
import { SqliteSessionStore } from "./infra/SqliteSessionStore";
import { RunManager } from "./runtime/RunManager";
import { createAgentRoutes } from "./transport/agentRoutes";

/** 조립된 에이전트 기능. 라우트와 정리 함수만 밖으로 낸다. */
export type AgentFeature = {
  readonly routes: Hono;
  /** 도는 Run을 끊고 DB를 닫는다. 프로세스가 내려갈 때 부른다. */
  close(): void;
};

/** 조립부가 넘기는 것. 이 기능이 스스로 만들지 않는 자원이 전부 여기 온다. */
export type AgentFeatureOptions = {
  readonly dataDir: string;
  readonly log: Logger;
  /** 워크스페이스 유스케이스 — 툴이 이것으로 파일을 다룬다. 조립부가 filesystem feature에서 가져온다. */
  readonly workspace: WorkspaceAccess;
  /** 어느 실행기를 조립할지. `core/config.ts`가 이미 검증했다. */
  readonly agent: AgentConfig;
};

/**
 * 에이전트 feature의 조립. 어느 저장소·실행기가 꽂히는지는 여기만 안다.
 *
 * `dataDir`가 `":memory:"`면 메모리 DB다 — 테스트용.
 */
export const createAgentFeature = ({ dataDir, log, workspace, agent }: AgentFeatureOptions): AgentFeature => {
  const db = openDatabase(dataDir === ":memory:" ? dataDir : path.join(dataDir, "data.db"));
  const events = new SqliteEventStore(db);
  const sessions = new SqliteSessionStore(db);
  // 키의 유무가 아니라 **고른 값**으로 가른다 — 키 이름 오타가 모드를 바꾸지 못한다.
  const runner: IAgentRunner =
    agent.runner === "scripted"
      ? new ScriptedRunner()
      : new AnthropicRunner({
          client: new Anthropic({ apiKey: agent.apiKey }),
          model: agent.model,
          tools: createWorkspaceTools(workspace),
        });
  log.info("agent.runner", { kind: agent.runner, model: agent.runner === "anthropic" ? agent.model : null });
  const runManager = new RunManager({ events, sessions, runner, log });
  return {
    routes: createAgentRoutes({ runManager, events }),
    close: () => {
      runManager.cancelAll();
      db.close();
    },
  };
};
