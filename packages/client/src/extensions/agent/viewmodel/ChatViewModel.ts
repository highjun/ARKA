import type { Disposable } from '#core/di';
import { ViewModelBase } from '#core/view-model';
import { atom } from 'nanostores';
import type { RunStatus } from 'contracts';
import type { IChatModel, SessionChat } from '../model/IChatModel';
import { emptyChat } from '../model/transcript';
import type { ChatComposerState, ChatSessionRow, ChatState, IChatViewModel } from './IChatViewModel';

type Draft = { readonly value: string; readonly mode: 'action' | 'plan'; readonly sending: boolean };
const EMPTY_DRAFT: Draft = { value: '', mode: 'action', sending: false };

/** Run 상태를 `StatusIndicator`의 어휘로. `queued`·`cancelled`는 화면에 따로 없어 가장 가까운 것으로. */
const statusOf = (status: RunStatus | null): ChatSessionRow['status'] => {
  switch (status) {
    case null:
      return null;
    case 'queued':
    case 'running':
      return 'running';
    case 'waitingInput':
      return 'waitingInput';
    case 'error':
      return 'error';
    case 'done':
    case 'cancelled':
      return 'done';
  }
};

/** `IChatViewModel`의 유일한 구현체. 초안(입력 중인 글)은 여기만 안다 — Model은 보낸 것만 안다. */
export class ChatViewModel extends ViewModelBase implements IChatViewModel {
  readonly #model: IChatModel;
  readonly #sessions;
  readonly #sessionsLoading;
  readonly #sessionsFailure;
  readonly #chats;
  readonly #drafts = this.observe(atom<Readonly<Record<string, Draft>>>({}));
  #subscription: Disposable | null = null;

  constructor({ chatModel }: { chatModel: IChatModel }) {
    super();
    this.#model = chatModel;
    this.#sessions = this.observe(atom(this.#computeSessions()));
    this.#sessionsLoading = this.observe(atom(chatModel.sessionsStatus === 'loading'));
    this.#sessionsFailure = this.observe(atom(chatModel.sessionsFailure));
    this.#chats = this.observe(atom(chatModel.chats));
  }

  onMount(): void {
    this.#subscription = this.#model.onDidChange(() => this.#recompute());
    void this.#model.loadSessions();
  }

  onDispose(): void {
    this.#subscription?.dispose();
    this.#subscription = null;
  }

  get sessions(): readonly ChatSessionRow[] {
    return this.#sessions.get();
  }

  get sessionsLoading(): boolean {
    return this.#sessionsLoading.get();
  }

  get sessionsFailure(): string | null {
    return this.#sessionsFailure.get();
  }

  async createSession(): Promise<string | null> {
    try {
      return (await this.#model.createSession()).id;
    } catch {
      return null;
    }
  }

  archiveSession(id: string, archived: boolean): void {
    void this.#model.archiveSession(id, archived);
  }

  openSession(id: string): void {
    this.#model.open(id);
  }

  chatOf(id: string): ChatState {
    const chat: SessionChat = this.#chats.get()[id] ?? emptyChat(id);
    const draft = this.#drafts.get()[id] ?? EMPTY_DRAFT;
    const running = chat.activeRunId !== null && chat.pendingInput === null;
    const composer: ChatComposerState = {
      value: draft.value,
      mode: draft.mode,
      canSubmit: draft.value.trim() !== '' && !draft.sending && !running,
      sending: draft.sending,
      placeholder: chat.pendingInput?.prompt ?? (running ? '에이전트가 작업 중이다…' : '무엇을 할까요?'),
    };
    return {
      items: chat.items,
      status: statusOf(chat.runStatus),
      pendingInput: chat.pendingInput,
      canCancel: chat.activeRunId !== null,
      composer,
      reconnecting: chat.connection === 'connecting' && chat.lastSeq > 0,
      failure: chat.failure,
    };
  }

  setDraft(id: string, value: string): void {
    this.#patchDraft(id, { value });
  }

  setMode(id: string, mode: 'action' | 'plan'): void {
    this.#patchDraft(id, { mode });
  }

  submit(id: string): void {
    const state = this.chatOf(id);
    if (!state.composer.canSubmit) return;
    const { value, mode } = state.composer;
    this.#patchDraft(id, { value: '', sending: true });
    void this.#model.send(id, value, mode).finally(() => this.#patchDraft(id, { sending: false }));
  }

  cancel(id: string): void {
    void this.#model.cancel(id);
  }

  #patchDraft(id: string, patch: Partial<Draft>): void {
    const drafts = this.#drafts.get();
    this.#drafts.set({ ...drafts, [id]: { ...(drafts[id] ?? EMPTY_DRAFT), ...patch } });
  }

  #computeSessions(): readonly ChatSessionRow[] {
    return this.#model.sessions.map((session) => ({
      id: session.id,
      title: session.title === '' ? '새 대화' : session.title,
      status: statusOf(session.lastRunStatus),
      archived: session.archived,
      timestamp: session.updatedAt,
    }));
  }

  #recompute(): void {
    this.#sessions.set(this.#computeSessions());
    this.#sessionsLoading.set(this.#model.sessionsStatus === 'loading');
    this.#sessionsFailure.set(this.#model.sessionsFailure);
    this.#chats.set(this.#model.chats);
  }
}
