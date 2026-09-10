import type { AgentSession, SessionId } from "#contracts";
import { AgentError } from "../domain/errors";
import type { ISessionStore, SessionPatch } from "../domain/ISessionStore";

/** 메모리 안의 `ISessionStore`. */
export class MemorySessionStore implements ISessionStore {
  readonly #sessions = new Map<SessionId, AgentSession>();

  /** 같은 id면 덮어쓴다 — 중복 검사는 부르는 쪽의 몫이다. */
  create(session: AgentSession): void {
    this.#sessions.set(session.id, session);
  }

  /** 없으면 `null`이다. 던지는 것은 `update`뿐이다. */
  get(id: SessionId): AgentSession | null {
    return this.#sessions.get(id) ?? null;
  }

  /** `updatedAt` 내림차순. 보관된 세션도 함께 온다. */
  list(): readonly AgentSession[] {
    return [...this.#sessions.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** `undefined`인 필드는 건너뛴다 — 지우기가 아니라 부분 갱신이다. */
  update(id: SessionId, patch: SessionPatch): AgentSession {
    const current = this.#sessions.get(id);
    if (current === undefined) throw new AgentError("SessionNotFound", `no such session: ${id}`);
    const next: AgentSession = { ...current, ...definedOnly(patch) };
    this.#sessions.set(id, next);
    return next;
  }
}

/** `undefined`인 키는 덮어쓰지 않는다 — `{ title: undefined }`가 제목을 지우면 안 된다. */
const definedOnly = (patch: SessionPatch): Partial<AgentSession> =>
  Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<AgentSession>;
