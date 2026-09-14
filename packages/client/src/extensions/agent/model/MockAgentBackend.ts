import type { AgentEvent, AgentSession, RunMode, RunResponse, SessionId } from "#contracts";
import type { IAgentApi } from "./IAgentApi";
import type { IAgentEvents } from "./IAgentEvents";

/** union의 각 멤버에 따로 Omit을 건다 — 그냥 `Omit<Union, K>`는 공통 키만 남긴다. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type EventInput = DistributiveOmit<AgentEvent, "seq" | "at">;

/** 서버가 Run 하나에 대해 낼 이벤트를 정하는 대본. 기본은 서버의 ScriptedRunner와 같은 모양이다. */
export type RunScript = (
  input: string,
  mode: RunMode,
  ids: { runId: string; next: () => string },
) => readonly DistributiveOmit<EventInput, "sessionId" | "runId">[];

const defaultScript: RunScript = (input, mode, { next }) => {
  const thinking = next();
  const call = next();
  const message = next();
  return [
    { type: "thinking.delta", blockId: thinking, text: `입력을 읽는다: "${input}"` },
    { type: "thinking.done", blockId: thinking },
    { type: "tool.call", callId: call, toolId: "echo", input: { text: input } },
    { type: "tool.result", callId: call, output: { text: input }, isError: false },
    { type: "assistant.delta", messageId: message, text: mode === "plan" ? "계획: " : "받은 입력: " },
    { type: "assistant.delta", messageId: message, text: input },
    { type: "assistant.done", messageId: message },
  ];
};

/**
 * 서버 전체를 메모리에서 흉내 내는 `IAgentApi` + `IAgentEvents`. 테스트·스토리·E2E 없이 도는 화면의 기준.
 *
 * 실물처럼 굴어야 한다 — `agentApi.contract.ts`가 그것을 강제한다. Run은 `startRun` 안에서
 * 대본대로 이벤트를 **동기로** 다 낸다(`hold`를 주면 `release()`까지 멈춘다).
 */
export class MockAgentBackend implements IAgentApi, IAgentEvents {
  readonly #sessions = new Map<SessionId, AgentSession>();
  readonly #events = new Map<SessionId, AgentEvent[]>();
  readonly #listeners = new Map<SessionId, Set<(event: AgentEvent) => void>>();
  readonly #active = new Map<SessionId, { runId: string; pending: string | null }>();
  readonly #script: RunScript;
  readonly #now: () => number;
  #ids = 0;

  /** `script`로 Run이 낼 이벤트 순서를 바꾼다 — 실패·입력 대기 시나리오를 여기서 만든다. */
  constructor({ script = defaultScript, now = () => Date.now() }: { script?: RunScript; now?: () => number } = {}) {
    this.#script = script;
    this.#now = now;
  }

  readonly #next = (): string => `id${String(++this.#ids)}`;

  /** `updatedAt` 내림차순. 보관된 것도 함께 온다. */
  async listSessions(): Promise<readonly AgentSession[]> {
    return [...this.#sessions.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** id는 `id1`, `id2`… 순으로 센다 — 테스트가 예측할 수 있게. */
  async createSession(title?: string): Promise<AgentSession> {
    const at = this.#now();
    const session: AgentSession = {
      id: this.#next(),
      title: title ?? "",
      createdAt: at,
      updatedAt: at,
      archived: false,
      lastRunStatus: null,
    };
    this.#sessions.set(session.id, session);
    return session;
  }

  /** 없는 id면 던진다. 준 필드만 덮어쓴다. */
  async updateSession(
    id: SessionId,
    patch: { readonly title?: string; readonly archived?: boolean },
  ): Promise<AgentSession> {
    const current = this.#require(id);
    if (patch.title !== undefined)
      this.#append({ sessionId: id, runId: null, type: "session.renamed", title: patch.title });
    if (patch.archived !== undefined)
      this.#append({ sessionId: id, runId: null, type: "session.archived", archived: patch.archived });
    const next = {
      ...current,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
      updatedAt: this.#now(),
    };
    this.#sessions.set(id, next);
    return next;
  }

  /** 스크립트대로 이벤트를 흘린다 — 모델을 부르지 않으므로 API 키 없이 화면이 돈다. */
  async startRun(sessionId: SessionId, input: string, mode: RunMode): Promise<RunResponse> {
    const session = this.#require(sessionId);
    if (this.#active.has(sessionId)) throw new Error("이미 도는 Run이 있다.");
    const runId = this.#next();
    if (session.title === "") await this.updateSession(sessionId, { title: input.slice(0, 40) });
    this.#active.set(sessionId, { runId, pending: null });
    this.#append({ sessionId, runId, type: "run.started", mode, input });
    this.#patch(sessionId, { lastRunStatus: "running" });

    for (const event of this.#script(input, mode, { runId, next: this.#next })) {
      this.#append({ ...event, sessionId, runId } as EventInput);
      if (event.type === "input.requested") {
        this.#active.set(sessionId, { runId, pending: event.requestId });
        this.#patch(sessionId, { lastRunStatus: "waitingInput" });
        return { runId, status: "waitingInput" };
      }
    }
    this.#finish(sessionId, runId, "done");
    return { runId, status: "running" };
  }

  /** 그 `requestId`로 기다리는 중이 아니면 던진다. */
  async provideInput(sessionId: SessionId, runId: string, requestId: string, text: string): Promise<void> {
    const active = this.#active.get(sessionId);
    if (active === undefined || active.runId !== runId) throw new Error("도는 Run이 없다.");
    if (active.pending !== requestId) throw new Error("입력을 기다리는 중이 아니다.");
    this.#append({ sessionId, runId, type: "input.provided", requestId, text });
    const message = this.#next();
    this.#append({ sessionId, runId, type: "assistant.delta", messageId: message, text: `${text}님, 알겠다.` });
    this.#append({ sessionId, runId, type: "assistant.done", messageId: message });
    this.#finish(sessionId, runId, "done");
    return;
  }

  /** 이미 끝난 Run이면 아무 일도 안 한다. */
  async cancelRun(sessionId: SessionId, runId: string): Promise<void> {
    const active = this.#active.get(sessionId);
    if (active === undefined || active.runId !== runId) throw new Error("도는 Run이 없다.");
    this.#finish(sessionId, runId, "cancelled");
    return;
  }

  /** `since` 뒤의 **밀린 이벤트를 동기로 먼저 흘린다** — 재연결이 놓친 것을 이어 받는다. */
  subscribe(sessionId: SessionId, since: number, onEvent: (event: AgentEvent) => void): () => void {
    const set = this.#listeners.get(sessionId) ?? new Set();
    set.add(onEvent);
    this.#listeners.set(sessionId, set);
    for (const event of this.#events.get(sessionId) ?? []) if (event.seq > since) onEvent(event);
    return () => {
      set.delete(onEvent);
    };
  }

  /** 테스트가 로그를 직접 본다. */
  eventsOf(sessionId: SessionId): readonly AgentEvent[] {
    return this.#events.get(sessionId) ?? [];
  }

  #require(id: SessionId): AgentSession {
    const session = this.#sessions.get(id);
    if (session === undefined) throw new Error(`no such session: ${id}`);
    return session;
  }

  #patch(id: SessionId, patch: Partial<AgentSession>): void {
    const current = this.#require(id);
    this.#sessions.set(id, { ...current, ...patch, updatedAt: this.#now() });
  }

  #finish(sessionId: SessionId, runId: string, status: "done" | "cancelled"): void {
    this.#active.delete(sessionId);
    this.#append({ sessionId, runId, type: "run.finished", status });
    this.#patch(sessionId, { lastRunStatus: status });
  }

  #append(input: EventInput): AgentEvent {
    const list = this.#events.get(input.sessionId) ?? [];
    const event = { ...input, seq: list.length + 1, at: this.#now() } as AgentEvent;
    list.push(event);
    this.#events.set(input.sessionId, list);
    for (const listener of [...(this.#listeners.get(input.sessionId) ?? [])]) listener(event);
    return event;
  }
}
