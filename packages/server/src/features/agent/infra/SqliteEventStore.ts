import type { DatabaseSync } from "node:sqlite";
import { AgentEvent, type AgentEventInput, type SessionId } from "#contracts";
import type { IEventStore } from "../domain/IEventStore";

type Row = { readonly payload: string };

/**
 * SQLite 위의 `IEventStore`. 이벤트 전체를 `payload`(JSON)로 저장하고 조회에 쓰는 열만 따로 둔다.
 *
 * `seq`는 같은 트랜잭션 안에서 `MAX(seq)+1`로 정한다 — 프로세스가 하나라 경쟁이 없다.
 * 읽을 때 스키마로 다시 parse한다 — 옛 버전이 남긴 모르는 type은 여기서 걸러진다.
 */
export class SqliteEventStore implements IEventStore {
  readonly #db: DatabaseSync;
  readonly #now: () => number;
  readonly #listeners = new Map<SessionId, Set<(event: AgentEvent) => void>>();

  constructor(db: DatabaseSync, { now = () => Date.now() }: { now?: () => number } = {}) {
    this.#db = db;
    this.#now = now;
  }

  append(input: AgentEventInput): AgentEvent {
    const at = this.#now();
    this.#db.exec("BEGIN IMMEDIATE");
    let event: AgentEvent;
    try {
      const row = this.#db.prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM events WHERE session_id = ?").get(input.sessionId) as { seq: number };
      event = { ...input, seq: row.seq, at } as AgentEvent;
      this.#db
        .prepare("INSERT INTO events (session_id, seq, run_id, at, type, payload) VALUES (?, ?, ?, ?, ?, ?)")
        .run(event.sessionId, event.seq, event.runId, event.at, event.type, JSON.stringify(event));
      this.#db.exec("COMMIT");
    } catch (error) {
      this.#db.exec("ROLLBACK");
      throw error;
    }
    for (const listener of [...(this.#listeners.get(input.sessionId) ?? [])]) listener(event);
    return event;
  }

  listSince(sessionId: SessionId, since: number): readonly AgentEvent[] {
    const rows = this.#db.prepare("SELECT payload FROM events WHERE session_id = ? AND seq > ? ORDER BY seq").all(sessionId, since) as Row[];
    const events: AgentEvent[] = [];
    for (const row of rows) {
      const parsed = AgentEvent.safeParse(JSON.parse(row.payload));
      if (parsed.success) events.push(parsed.data);
    }
    return events;
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
