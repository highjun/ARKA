import type { Disposable } from "#core/di";
import { ViewModelBase } from "#core/viewmodel";
import { atom } from "nanostores";
import type { RunStatus } from "#contracts";
import type { IChatModel, SessionChat } from "../model/IChatModel";
import { emptyChat } from "../model/transcript";
import type { ChatComposerState, ChatSessionRow, ChatState, IChatViewModel } from "./IChatViewModel";

type Draft = { readonly value: string; readonly mode: "action" | "plan"; readonly sending: boolean };
const EMPTY_DRAFT: Draft = { value: "", mode: "action", sending: false };

/** Run 상태를 `StatusIndicator`의 어휘로. `queued`·`cancelled`는 화면에 따로 없어 가장 가까운 것으로. */
const statusOf = (status: RunStatus | null): ChatSessionRow["status"] => {
  switch (status) {
    case null:
      return null;
    case "queued":
    case "running":
      return "running";
    case "waitingInput":
      return "waitingInput";
    case "error":
      return "error";
    case "done":
    case "cancelled":
      return "done";
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

  /** 구독은 `onMount`에서 시작한다 — 만드는 것만으로는 서버를 부르지 않는다. */
  constructor({ chatModel }: { chatModel: IChatModel }) {
    super();
    this.#model = chatModel;
    this.#sessions = this.observe(atom(this.#computeSessions()));
    this.#sessionsLoading = this.observe(atom(chatModel.sessionsStatus === "loading"));
    this.#sessionsFailure = this.observe(atom(chatModel.sessionsFailure));
    this.#chats = this.observe(atom(chatModel.chats));
  }

  /** 구독을 걸고 세션 목록을 한 번 읽는다. */
  onMount(): void {
    this.#subscription = this.#model.onDidChange(() => this.#recompute());
    void this.#model.loadSessions();
  }

  /** 구독만 끊는다 — 열린 세션의 스트림은 Model이 든다. */
  onDispose(): void {
    this.#subscription?.dispose();
    this.#subscription = null;
  }

  /** 화면이 그대로 쓰는 행이다. 보관된 것도 함께 온다. */
  get sessions(): readonly ChatSessionRow[] {
    return this.#sessions.get();
  }

  /** 목록을 읽는 중인가. 개별 대화의 연결 상태와 무관하다. */
  get sessionsLoading(): boolean {
    return this.#sessionsLoading.get();
  }

  /** 목록 읽기의 마지막 실패. 성공하면 지워진다. */
  get sessionsFailure(): string | null {
    return this.#sessionsFailure.get();
  }

  /** 실패하면 `null`이다 — 부르는 쪽이 탭을 열지 말지 이 값으로 정한다. */
  async createSession(): Promise<string | null> {
    try {
      return (await this.#model.createSession()).id;
    } catch {
      return null;
    }
  }

  /** 결과를 기다리지 않는다 — 끝나면 구독을 통해 화면이 갱신된다. */
  archiveSession(id: string, archived: boolean): void {
    void this.#model.archiveSession(id, archived);
  }

  /** 이미 열려 있으면 아무 일도 안 한다. 스트림은 Model이 붙인다. */
  openSession(id: string): void {
    this.#model.open(id);
  }

  /** 아직 없는 세션이면 빈 상태를 돌려준다 — 화면이 `undefined`를 다루지 않아도 된다. */
  chatOf(id: string): ChatState {
    const chat: SessionChat = this.#chats.get()[id] ?? emptyChat(id);
    const draft = this.#drafts.get()[id] ?? EMPTY_DRAFT;
    const running = chat.activeRunId !== null && chat.pendingInput === null;
    const composer: ChatComposerState = {
      value: draft.value,
      mode: draft.mode,
      canSubmit: draft.value.trim() !== "" && !draft.sending && !running,
      sending: draft.sending,
      placeholder: chat.pendingInput?.prompt ?? (running ? "에이전트가 작업 중이다…" : "무엇을 할까요?"),
    };
    return {
      items: chat.items,
      status: statusOf(chat.runStatus),
      pendingInput: chat.pendingInput,
      canCancel: chat.activeRunId !== null,
      composer,
      reconnecting: chat.connection === "connecting" && chat.lastSeq > 0,
      failure: chat.failure,
    };
  }

  /** 초안은 이 ViewModel만 갖는다 — Model로 가지 않아 새로고침하면 사라진다. */
  setDraft(id: string, value: string): void {
    this.#patchDraft(id, { value });
  }

  /** 세션마다 따로 기억한다. 보낼 때 함께 실린다. */
  setMode(id: string, mode: "action" | "plan"): void {
    this.#patchDraft(id, { mode });
  }

  /** `canSubmit`이 아니면 아무 일도 안 한다. 보내기 **전에** 입력창을 비운다. */
  submit(id: string): void {
    const state = this.chatOf(id);
    if (!state.composer.canSubmit) return;
    const { value, mode } = state.composer;
    this.#patchDraft(id, { value: "", sending: true });
    void this.#model.send(id, value, mode).finally(() => this.#patchDraft(id, { sending: false }));
  }

  /** 도는 Run이 없으면 Model이 조용히 넘어간다. */
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
      title: session.title === "" ? "새 대화" : session.title,
      status: statusOf(session.lastRunStatus),
      archived: session.archived,
      timestamp: session.updatedAt,
    }));
  }

  #recompute(): void {
    this.#sessions.set(this.#computeSessions());
    this.#sessionsLoading.set(this.#model.sessionsStatus === "loading");
    this.#sessionsFailure.set(this.#model.sessionsFailure);
    this.#chats.set(this.#model.chats);
  }
}
