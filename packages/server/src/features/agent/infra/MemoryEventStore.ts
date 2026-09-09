import type { AgentEvent, AgentEventInput, SessionId } from "#contracts";
import type { IEventStore } from "../domain/IEventStore";

/** 메모리 안의 `IEventStore`. 테스트와 임시 실행용 — 프로세스가 죽으면 사라진다. */
export class MemoryEventStore implements IEventStore {
  readonly #events = new Map<SessionId, AgentEvent[]>();
  readonly #listeners = new Map<SessionId, Set<(event: AgentEvent) => void>>();
  readonly #now: () => number;

  constructor({ now = () => Date.now() }: { now?: () => number } = {}) {
    this.#now = now;
  }

  append(input: AgentEventInput): AgentEvent {
    const list = this.#events.get(input.sessionId) ?? [];
    const event = { ...input, seq: list.length + 1, at: this.#now() } as AgentEvent;
    list.push(event);
    this.#events.set(input.sessionId, list);
    for (const listener of [...(this.#listeners.get(input.sessionId) ?? [])]) listener(event);
    return event;
  }

  listSince(sessionId: SessionId, since: number): readonly AgentEvent[] {
    return (this.#events.get(sessionId) ?? []).filter((event) => event.seq > since);
  }

  subscribe(sessionId: SessionId, listener: (event: AgentEvent) => void): () => void {
    const set = this.#listeners.get(sessionId) ?? new Set();
    set.add(listener);
    this.#listeners.set(sessionId, set);
    return () => {
      set.delete(listener);
    };
  }
}
