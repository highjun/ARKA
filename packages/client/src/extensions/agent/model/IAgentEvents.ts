import { createToken } from "#core/di";
import type { AgentEvent, SessionId } from "#contracts";

export const AgentEventsToken = createToken<IAgentEvents>("agentEvents");
/**
 * 세션의 이벤트 로그를 `since` 뒤부터 이어 받는 통로. SSE인지 무엇인지는 Adapter의 사정이다.
 *
 * `subscribe`는 즉시 시작하고 해지 함수를 돌려준다. 끊기면 스스로 다시 붙되 마지막으로 받은
 * `seq`부터 이어 받는다 — 같은 이벤트를 두 번 주지 않는다. 모르는 `type`은 버린다.
 */
export interface IAgentEvents {
  subscribe(sessionId: SessionId, since: number, onEvent: (event: AgentEvent) => void): () => void;
}
