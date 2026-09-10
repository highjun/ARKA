import type { AgentEvent, AgentEventInput, SessionId } from "#contracts";
import type { IEventStore } from "../domain/IEventStore";

/** 메모리 안의 `IEventStore`. 테스트와 임시 실행용 — 프로세스가 죽으면 사라진다. */
export class MemoryEventStore implements IEventStore {
  readonly #events = new Map<SessionId, AgentEvent[]>();
  readonly #listeners = new Map<SessionId, Set<(event: AgentEvent) => void>>();
  readonly #now: () => number;

  /** `now`를 받는 이유는 테스트가 시각을 붙잡기 위해서다. */
  constructor({ now = () => Date.now() }: { now?: () => number } = {}) {
    this.#now = now;
  }

  /** `seq`는 세션별 1부터다. 구독자에게 동기로 바로 흘린다. */
  append(input: AgentEventInput): AgentEvent {
    const list = this.#events.get(input.sessionId) ?? [];
    const event = { ...input, seq: list.length + 1, at: this.#now() } as AgentEvent;
    list.push(event);
    this.#events.set(input.sessionId, list);
    for (const listener of [...(this.#listeners.get(input.sessionId) ?? [])]) listener(event);
    return event;
  }

  /** `since`는 **배타적**이다 — 그 번호는 빼고 그 뒤만 온다. */
  listSince(sessionId: SessionId, since: number): readonly AgentEvent[] {
    return (this.#events.get(sessionId) ?? []).filter((event) => event.seq > since);
  }

  /** 지난 이벤트는 돌려주지 않는다 — 구독 시점 이후만 온다. 해지 함수를 돌려준다. */
  subscribe(sessionId: SessionId, listener: (event: AgentEvent) => void): () => void {
    const set = this.#listeners.get(sessionId) ?? new Set();
    set.add(listener);
    this.#listeners.set(sessionId, set);
    return () => {
      set.delete(listener);
    };
  }
}
