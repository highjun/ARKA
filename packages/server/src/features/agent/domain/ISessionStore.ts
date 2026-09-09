import type { AgentSession, RunStatus, SessionId } from "#contracts";

/** 세션 요약을 바꾸는 조각. 이벤트에서 투영된 값이라 원본이 아니다 — 지우고 다시 만들 수 있어야 한다. */
export type SessionPatch = {
  readonly title?: string;
  readonly archived?: boolean;
  readonly lastRunStatus?: RunStatus | null;
  readonly updatedAt?: number;
};

/**
 * 세션 목록의 저장소. 메시지 본문은 여기 없다(`IEventStore`).
 *
 * 세션 자체의 생성은 이벤트가 아니다 — 세션이 있어야 이벤트를 붙일 수 있으므로 여기서 먼저 만든다.
 */
export interface ISessionStore {
  create(session: AgentSession): void;
  /** 없으면 `null`. */
  get(id: SessionId): AgentSession | null;
  /** `updatedAt` 내림차순. 보관된 것도 포함한다 — 거르는 것은 화면의 몫이다. */
  list(): readonly AgentSession[];
  /**
   * 조각을 덮어쓴다.
   * @throws AgentError `SessionNotFound`
   */
  update(id: SessionId, patch: SessionPatch): AgentSession;
}
