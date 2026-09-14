import type { DatabaseSync } from "node:sqlite";
import type { AgentSession, RunStatus, SessionId } from "#contracts";
import { AgentError } from "../domain/errors";
import type { ISessionStore, SessionPatch } from "../domain/ISessionStore";

type Row = {
  readonly id: string;
  readonly title: string;
  readonly created_at: number;
  readonly updated_at: number;
  readonly archived: number;
  readonly last_run_status: string | null;
};

const toSession = (row: Row): AgentSession => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archived: row.archived === 1,
  lastRunStatus: row.last_run_status as RunStatus | null,
});

/** SQLite 위의 `ISessionStore`. 이벤트에서 투영된 요약이라 지우고 다시 만들 수 있어야 한다. */
export class SqliteSessionStore implements ISessionStore {
  readonly #db: DatabaseSync;

  /** 스키마는 이미 서 있다고 본다 — 마이그레이션은 `database.ts`가 한다. */
  constructor(db: DatabaseSync) {
    this.#db = db;
  }

  /** 같은 id면 SQLite가 제약 위반으로 던진다 — 메모리 구현과 달리 덮어쓰지 않는다. */
  create(session: AgentSession): void {
    this.#db
      .prepare(
        "INSERT INTO sessions (id, title, created_at, updated_at, archived, last_run_status) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        session.id,
        session.title,
        session.createdAt,
        session.updatedAt,
        session.archived ? 1 : 0,
        session.lastRunStatus,
      );
  }

  /** 없으면 `null`이다. 던지는 것은 `update`뿐이다. */
  get(id: SessionId): AgentSession | null {
    const row = this.#db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as Row | undefined;
    return row === undefined ? null : toSession(row);
  }

  /** `updated_at` 내림차순, 같으면 `created_at` 순. 보관된 세션도 함께 온다. */
  list(): readonly AgentSession[] {
    const rows = this.#db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC, created_at DESC").all() as Row[];
    return rows.map(toSession);
  }

  /** 읽고 합쳐 다시 쓴다 — 한 프로세스만 이 파일을 여는 것이 전제다. */
  update(id: SessionId, patch: SessionPatch): AgentSession {
    const current = this.get(id);
    if (current === null) throw new AgentError("SessionNotFound", `no such session: ${id}`);
    const next: AgentSession = {
      ...current,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
      ...(patch.lastRunStatus !== undefined ? { lastRunStatus: patch.lastRunStatus } : {}),
      ...(patch.updatedAt !== undefined ? { updatedAt: patch.updatedAt } : {}),
    };
    this.#db
      .prepare("UPDATE sessions SET title = ?, updated_at = ?, archived = ?, last_run_status = ? WHERE id = ?")
      .run(next.title, next.updatedAt, next.archived ? 1 : 0, next.lastRunStatus, id);
    return next;
  }
}
