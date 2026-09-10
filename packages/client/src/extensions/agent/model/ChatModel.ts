import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { AgentSession, RunMode, SessionId } from '#contracts';
import type { IAgentApi } from './IAgentApi';
import type { IAgentEvents } from './IAgentEvents';
import type { IChatModel, SessionChat, SessionsStatus } from './IChatModel';
import { emptyChat, foldEvent } from './transcript';

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** `IChatModel`의 유일한 구현체. 이벤트를 `foldEvent`로 접어 대화를 유지한다. */
export class ChatModel implements IChatModel {
  readonly #api: IAgentApi;
  readonly #events: IAgentEvents;
  readonly #changed = new Emitter();
  readonly #subscriptions = new Map<SessionId, () => void>();
  #sessions: readonly AgentSession[] = [];
  #sessionsStatus: SessionsStatus = 'idle';
  #sessionsFailure: string | null = null;
  #chats: Readonly<Record<SessionId, SessionChat>> = {};

  readonly confirmWrites: () => boolean;

  /** `confirmWrites`는 설정에서 온다 — 이 Model이 설정 Model을 직접 보지 않게 함수로 받는다. */
  constructor({ api, events, confirmWrites = () => true }: { api: IAgentApi; events: IAgentEvents; confirmWrites?: () => boolean }) {
    this.#api = api;
    this.#events = events;
    this.confirmWrites = confirmWrites;
  }

  /** 보관된 세션도 함께 온다 — 거르는 것은 화면의 몫이다. */
  get sessions(): readonly AgentSession[] {
    return this.#sessions;
  }

  /** 목록의 상태다 — 개별 대화의 연결 상태는 `chats`가 든다. */
  get sessionsStatus(): SessionsStatus {
    return this.#sessionsStatus;
  }

  /** 목록 읽기의 마지막 실패. 성공하면 지워진다. */
  get sessionsFailure(): string | null {
    return this.#sessionsFailure;
  }

  /** 열려 있는 세션만 키로 있다 — `close`하면 키째 사라진다. */
  get chats(): Readonly<Record<SessionId, SessionChat>> {
    return this.#chats;
  }

  /** 실패해도 던지지 않는다 — `sessionsStatus`가 `error`가 되고 사유가 남는다. */
  async loadSessions(): Promise<void> {
    this.#sessionsStatus = 'loading';
    this.#changed.fire();
    try {
      this.#sessions = await this.#api.listSessions();
      this.#sessionsStatus = 'loaded';
      this.#sessionsFailure = null;
    } catch (error) {
      this.#sessionsStatus = 'error';
      this.#sessionsFailure = messageOf(error);
    }
    this.#changed.fire();
  }

  /** 목록 맨 앞에 넣는다. 실패하면 **던진다** — 부르는 쪽이 그 결과로 탭을 열기 때문이다. */
  async createSession(): Promise<AgentSession> {
    const session = await this.#api.createSession();
    this.#sessions = [session, ...this.#sessions];
    this.#changed.fire();
    return session;
  }

  /** 서버가 돌려준 세션으로 목록을 갈아 끼운다 — 낙관적 갱신을 하지 않는다. */
  async renameSession(id: SessionId, title: string): Promise<void> {
    this.#replaceSession(await this.#api.updateSession(id, { title }));
  }

  /** 목록에서 지우지 않는다 — `archived` 플래그만 바뀐다. */
  async archiveSession(id: SessionId, archived: boolean): Promise<void> {
    this.#replaceSession(await this.#api.updateSession(id, { archived }));
  }

  /** 이미 열려 있으면 아무 일도 안 한다. `lastSeq`부터 이어 받아 놓친 이벤트가 없다. */
  open(sessionId: SessionId): void {
    if (this.#subscriptions.has(sessionId)) return;
    const chat = this.#chats[sessionId] ?? emptyChat(sessionId);
    this.#setChat({ ...chat, connection: 'connecting' });
    const unsubscribe = this.#events.subscribe(sessionId, chat.lastSeq, (event) => {
      const current = this.#chats[sessionId];
      if (current === undefined) return;
      this.#setChat({ ...foldEvent(current, event), connection: 'live' });
      // 세션 요약도 투영이다 — 제목·상태를 목록에 반영한다.
      if (event.type === 'session.renamed') this.#patchSession(sessionId, { title: event.title, updatedAt: event.at });
      if (event.type === 'session.archived') this.#patchSession(sessionId, { archived: event.archived, updatedAt: event.at });
      if (event.type === 'run.started') this.#patchSession(sessionId, { lastRunStatus: 'running', updatedAt: event.at });
      if (event.type === 'input.requested') this.#patchSession(sessionId, { lastRunStatus: 'waitingInput', updatedAt: event.at });
      if (event.type === 'run.finished') this.#patchSession(sessionId, { lastRunStatus: event.status, updatedAt: event.at });
    });
    this.#subscriptions.set(sessionId, unsubscribe);
  }

  /** 구독을 끊고 대화를 버린다 — 다시 열면 서버에서 처음부터 받는다. */
  close(sessionId: SessionId): void {
    this.#subscriptions.get(sessionId)?.();
    this.#subscriptions.delete(sessionId);
    const { [sessionId]: _dropped, ...rest } = this.#chats;
    this.#chats = rest;
    this.#changed.fire();
  }

  /** 입력 대기 중이면 그 응답으로, 아니면 새 Run으로 간다. Run이 도는 중이면 아무 일도 안 한다. */
  async send(sessionId: SessionId, text: string, mode: RunMode): Promise<void> {
    const chat = this.#chats[sessionId] ?? emptyChat(sessionId);
    if (chat.activeRunId !== null && chat.pendingInput === null) return;
    try {
      if (chat.pendingInput !== null) {
        await this.#api.provideInput(sessionId, chat.pendingInput.runId, chat.pendingInput.requestId, text);
      } else {
        await this.#api.startRun(sessionId, text, mode, { confirmWrites: this.confirmWrites() });
      }
      this.#setChat({ ...(this.#chats[sessionId] ?? chat), failure: null });
    } catch (error) {
      this.#setChat({ ...(this.#chats[sessionId] ?? chat), failure: messageOf(error) });
    }
  }

  /** 도는 Run이 없으면 아무 일도 안 한다. 실패는 던지지 않고 `failure`에 남는다. */
  async cancel(sessionId: SessionId): Promise<void> {
    const chat = this.#chats[sessionId];
    if (chat === undefined || chat.activeRunId === null) return;
    try {
      await this.#api.cancelRun(sessionId, chat.activeRunId);
      this.#setChat({ ...(this.#chats[sessionId] ?? chat), failure: null });
    } catch (error) {
      this.#setChat({ ...(this.#chats[sessionId] ?? chat), failure: messageOf(error) });
    }
  }

  /** 무엇이 바뀌었는지는 주지 않는다 — 받는 쪽이 다시 읽는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  #setChat(chat: SessionChat): void {
    this.#chats = { ...this.#chats, [chat.sessionId]: chat };
    this.#changed.fire();
  }

  #replaceSession(session: AgentSession): void {
    this.#sessions = this.#sessions.some((s) => s.id === session.id) ? this.#sessions.map((s) => (s.id === session.id ? session : s)) : [session, ...this.#sessions];
    this.#changed.fire();
  }

  #patchSession(id: SessionId, patch: Partial<AgentSession>): void {
    const current = this.#sessions.find((s) => s.id === id);
    if (current === undefined) return;
    this.#replaceSession({ ...current, ...patch });
  }
}
