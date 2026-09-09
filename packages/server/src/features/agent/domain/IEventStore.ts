import type { AgentEvent, AgentEventInput, SessionId } from "#contracts";

/**
 * 이벤트 로그 — 세션 안에서 일어난 모든 일의 원본(→ ADR 0019). append-only다.
 *
 * `seq`는 세션마다 1부터 단조 증가하고 저장소가 붙인다. 구독자는 append 직후 **동기로** 불린다 —
 * 그래야 SSE가 이벤트를 놓치지 않는다(`listSince` 뒤 `subscribe` 사이의 틈은 호출부가 `since`로 메운다).
 */
export interface IEventStore {
  /** `seq`·`at`을 붙여 저장하고 저장된 이벤트를 돌려준다. 같은 세션의 `seq`는 겹치지 않는다. */
  append(event: AgentEventInput): AgentEvent;
  /** `since`보다 큰 `seq`의 이벤트를 순서대로. `since`가 0이면 전부. */
  listSince(sessionId: SessionId, since: number): readonly AgentEvent[];
  /** 그 세션에 이벤트가 붙을 때마다 부른다. 돌려받은 함수로 끊는다. */
  subscribe(sessionId: SessionId, listener: (event: AgentEvent) => void): () => void;
}
