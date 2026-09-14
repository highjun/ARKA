import type { AgentSession, RunId, RunMode, RunResponse, SessionId } from "#contracts";
import type { Logger } from "../../../core/log";
import { serializeError } from "../../../core/log";
import { AgentError } from "../domain/errors";
import type { IAgentRunner, RunContext, RunEventInput } from "../domain/IAgentRunner";
import type { IEventStore } from "../domain/IEventStore";
import type { ISessionStore } from "../domain/ISessionStore";

type ActiveRun = {
  readonly runId: RunId;
  readonly abort: AbortController;
  /** `requestId` → 답을 기다리는 곳. */
  readonly pendingInput: Map<string, { resolve: (text: string) => void; reject: (error: Error) => void }>;
};

/** 제목이 없는 세션은 첫 입력의 앞부분을 제목으로 삼는다. */
const TITLE_MAX = 40;

/**
 * Run의 수명을 소유한다 — 시작·입력 전달·끊기·끝 처리. 세션마다 도는 Run은 하나뿐이다.
 *
 * `runtime/`인 이유: 요청이 끝나도 Run은 계속 돌고, 클라이언트가 나갔다 와도 이어져야 한다.
 * 이벤트는 전부 `IEventStore`에 남기고, 세션 요약(`ISessionStore`)은 그 투영으로 함께 갱신한다.
 */
export class RunManager {
  readonly #events: IEventStore;
  readonly #sessions: ISessionStore;
  readonly #runner: IAgentRunner;
  readonly #log: Logger;
  readonly #now: () => number;
  readonly #newId: () => string;
  readonly #active = new Map<SessionId, ActiveRun>();

  /** `now`·`newId`를 받는 이유는 테스트가 시각과 식별자를 붙잡기 위해서다. */
  constructor({
    events,
    sessions,
    runner,
    log,
    now = () => Date.now(),
    newId = () => crypto.randomUUID(),
  }: {
    events: IEventStore;
    sessions: ISessionStore;
    runner: IAgentRunner;
    log: Logger;
    now?: () => number;
    newId?: () => string;
  }) {
    this.#events = events;
    this.#sessions = sessions;
    this.#runner = runner;
    this.#log = log;
    this.#now = now;
    this.#newId = newId;
  }

  /** `title`이 없으면 기본 제목이 붙는다. 만든 즉시 저장된다. */
  createSession(title: string | undefined): AgentSession {
    const at = this.#now();
    const session: AgentSession = {
      id: this.#newId(),
      title: title ?? "",
      createdAt: at,
      updatedAt: at,
      archived: false,
      lastRunStatus: null,
    };
    this.#sessions.create(session);
    return session;
  }

  /** 보관된 세션이면 실행 중이 아니어도 돌려준다. @throws AgentError `SessionNotFound` */
  getSession(sessionId: SessionId): AgentSession {
    const session = this.#sessions.get(sessionId);
    if (session === null) throw new AgentError("SessionNotFound", `no such session: ${sessionId}`);
    return session;
  }

  /** 보관된 것도 함께 온다 — 거르는 것은 화면의 몫이다. */
  listSessions(): readonly AgentSession[] {
    return this.#sessions.list();
  }

  /** 제목·보관은 이벤트로도 남긴다 — 세션 요약은 투영이고 원본은 로그다. */
  updateSession(sessionId: SessionId, patch: { title?: string; archived?: boolean }): AgentSession {
    this.getSession(sessionId);
    if (patch.title !== undefined)
      this.#events.append({ sessionId, runId: null, type: "session.renamed", title: patch.title });
    if (patch.archived !== undefined)
      this.#events.append({ sessionId, runId: null, type: "session.archived", archived: patch.archived });
    return this.#sessions.update(sessionId, { ...patch, updatedAt: this.#now() });
  }

  /**
   * Run을 시작한다. 응답은 즉시 돌아오고 실행은 뒤에서 이어진다.
   * @throws AgentError `SessionNotFound`, `RunInProgress`
   */
  start(
    sessionId: SessionId,
    input: string,
    mode: RunMode,
    { confirmWrites = true }: { confirmWrites?: boolean } = {},
  ): RunResponse {
    const session = this.getSession(sessionId);
    if (this.#active.has(sessionId))
      throw new AgentError("RunInProgress", `session ${sessionId} already has a running run`);

    const runId = this.#newId();
    const history = this.#events.listSince(sessionId, 0);
    if (session.title === "") this.updateSession(sessionId, { title: input.slice(0, TITLE_MAX) });

    const active: ActiveRun = { runId, abort: new AbortController(), pendingInput: new Map() };
    this.#active.set(sessionId, active);
    this.#events.append({ sessionId, runId, type: "run.started", mode, input });
    this.#sessions.update(sessionId, { lastRunStatus: "running", updatedAt: this.#now() });

    void this.#execute(sessionId, active, { input, mode, history, confirmWrites });
    return { runId, status: "running" };
  }

  /** 실행이 그 `requestId`로 기다리는 동안에만 받는다. @throws AgentError `RunNotFound`, `NotWaitingInput` */
  provideInput(sessionId: SessionId, runId: RunId, requestId: string, text: string): void {
    const active = this.#requireActive(sessionId, runId);
    const pending = active.pendingInput.get(requestId);
    if (pending === undefined)
      throw new AgentError("NotWaitingInput", `run ${runId} is not waiting for input ${requestId}`);
    active.pendingInput.delete(requestId);
    this.#events.append({ sessionId, runId, type: "input.provided", requestId, text });
    this.#sessions.update(sessionId, { lastRunStatus: "running", updatedAt: this.#now() });
    pending.resolve(text);
  }

  /** 실행을 끊고 대기 중인 입력 요청을 모두 거절한다. @throws AgentError `RunNotFound` */
  cancel(sessionId: SessionId, runId: RunId): void {
    const active = this.#requireActive(sessionId, runId);
    active.abort.abort();
    for (const pending of active.pendingInput.values()) pending.reject(new Error("run cancelled"));
    active.pendingInput.clear();
  }

  /** 도는 Run이 있는 세션 수 — 종료 시 정리와 진단용. */
  get activeCount(): number {
    return this.#active.size;
  }

  /** 프로세스가 내려갈 때 도는 Run을 전부 끊는다. */
  cancelAll(): void {
    for (const [sessionId, active] of this.#active) this.cancel(sessionId, active.runId);
  }

  #requireActive(sessionId: SessionId, runId: RunId): ActiveRun {
    const active = this.#active.get(sessionId);
    if (active === undefined || active.runId !== runId)
      throw new AgentError("RunNotFound", `no running run ${runId} in session ${sessionId}`);
    return active;
  }

  async #execute(
    sessionId: SessionId,
    active: ActiveRun,
    {
      input,
      mode,
      history,
      confirmWrites,
    }: { input: string; mode: RunMode; history: RunContext["history"]; confirmWrites: boolean },
  ): Promise<void> {
    const { runId, abort } = active;
    const emit = (event: RunEventInput): void => {
      this.#events.append({ ...event, sessionId, runId } as Parameters<IEventStore["append"]>[0]);
    };
    const context: RunContext = {
      sessionId,
      runId,
      input,
      mode,
      confirmWrites,
      history,
      signal: abort.signal,
      emit,
      requestInput: (prompt) =>
        new Promise<string>((resolve, reject) => {
          if (abort.signal.aborted) {
            reject(new Error("run cancelled"));
            return;
          }
          const requestId = this.#newId();
          active.pendingInput.set(requestId, { resolve, reject });
          this.#events.append({ sessionId, runId, type: "input.requested", requestId, prompt });
          this.#sessions.update(sessionId, { lastRunStatus: "waitingInput", updatedAt: this.#now() });
        }),
    };

    let status: "done" | "error" | "cancelled" = "done";
    try {
      await this.#runner.run(context);
      if (abort.signal.aborted) status = "cancelled";
    } catch (error) {
      if (abort.signal.aborted) {
        status = "cancelled";
      } else {
        status = "error";
        const message = error instanceof Error ? error.message : String(error);
        this.#events.append({ sessionId, runId, type: "run.error", message });
        this.#log.error("agent.run.failed", { sessionId, runId, error: serializeError(error) });
      }
    } finally {
      this.#active.delete(sessionId);
      this.#events.append({ sessionId, runId, type: "run.finished", status });
      this.#sessions.update(sessionId, { lastRunStatus: status, updatedAt: this.#now() });
    }
  }
}
