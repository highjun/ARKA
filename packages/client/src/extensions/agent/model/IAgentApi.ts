import { createToken } from '#core/di';
import type { AgentSession, RunMode, RunResponse, SessionId } from 'contracts';

export type { AgentSession, RunMode, RunResponse, SessionId };

export const AgentApiToken = createToken<IAgentApi>('agentApi');
/**
 * 서버의 `/api/agent/*` 요청-응답 통로. 스트림은 `IAgentEvents`가 따로 맡는다.
 *
 * 실패는 전부 던진다 — 메시지는 사람이 읽을 수 있는 말이고, 화면은 그것을 그대로 보여준다.
 * 실패 종류로 분기해야 하는 것은 아직 없다(도는 Run이 있으면 화면이 애초에 보내지 않는다).
 */
export interface IAgentApi {
  listSessions(): Promise<readonly AgentSession[]>;
  createSession(title?: string): Promise<AgentSession>;
  updateSession(id: SessionId, patch: { readonly title?: string; readonly archived?: boolean }): Promise<AgentSession>;
  /** 응답은 즉시 온다 — 진행은 `IAgentEvents`로 본다. */
  startRun(sessionId: SessionId, input: string, mode: RunMode): Promise<RunResponse>;
  provideInput(sessionId: SessionId, runId: string, requestId: string, text: string): Promise<void>;
  cancelRun(sessionId: SessionId, runId: string): Promise<void>;
}
