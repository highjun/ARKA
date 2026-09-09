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

  constructor({ api, events, confirmWrites = () => true }: { api: IAgentApi; events: IAgentEvents; confirmWrites?: () => boolean }) {
    this.#api = api;
    this.#events = events;
    this.confirmWrites = confirmWrites;
  }

  get sessions(): readonly AgentSession[] {
    return this.#sessions;
  }

  get sessionsStatus(): SessionsStatus {
    return this.#sessionsStatus;
  }

  get sessionsFailure(): string | null {
    return this.#sessionsFailure;
  }

  get chats(): Readonly<Record<SessionId, SessionChat>> {
    return this.#chats;
  }

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

  async createSession(): Promise<AgentSession> {
    const session = await this.#api.createSession();
    this.#sessions = [session, ...this.#sessions];
    this.#changed.fire();
    return session;
  }

  async renameSession(id: SessionId, title: string): Promise<void> {
    this.#replaceSession(await this.#api.updateSession(id, { title }));
  }

  async archiveSession(id: SessionId, archived: boolean): Promise<void> {
    this.#replaceSession(await this.#api.updateSession(id, { archived }));
  }

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

  close(sessionId: SessionId): void {
    this.#subscriptions.get(sessionId)?.();
    this.#subscriptions.delete(sessionId);
    const { [sessionId]: _dropped, ...rest } = this.#chats;
    this.#chats = rest;
    this.#changed.fire();
  }

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
