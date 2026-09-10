import { createToken } from '#core/di';
import type { PendingInput, TranscriptItem } from '../model/IChatModel';

/** 세션 목록 한 줄. `status`는 컴포넌트(`StatusIndicator`)의 어휘로 바꾼 것이다. */
export type ChatSessionRow = {
  readonly id: string;
  readonly title: string;
  readonly status: 'running' | 'done' | 'waitingInput' | 'error' | null;
  readonly archived: boolean;
  /** ms since epoch — 마지막 활동. */
  readonly timestamp: number;
};

/** 입력창이 그대로 쓰는 모양 — 보낼 수 있는지 판단이 이미 `canSubmit`에 접혀 있다. */
export type ChatComposerState = {
  readonly value: string;
  readonly mode: 'action' | 'plan';
  /** 보낼 수 있는가 — 빈 값이거나 보내는 중이거나 Run이 돌면(입력 대기 제외) 아니다. */
  readonly canSubmit: boolean;
  /** 요청이 나가 있는 동안. */
  readonly sending: boolean;
  readonly placeholder: string;
};

/** 대화 화면이 그대로 쓰는 모양. Model의 상태를 화면 어휘로 옮긴 것이다. */
export type ChatState = {
  readonly items: readonly TranscriptItem[];
  /** 헤더의 상태 표시. Run이 없으면 `null`. */
  readonly status: 'running' | 'done' | 'waitingInput' | 'error' | null;
  readonly pendingInput: PendingInput | null;
  /** Run이 도는 중이라 끊을 수 있다. */
  readonly canCancel: boolean;
  readonly composer: ChatComposerState;
  /** 스트림이 끊겨 다시 붙는 중이다 — 화면은 조용히 알린다. */
  readonly reconnecting: boolean;
  readonly failure: string | null;
};

export const ChatViewModelToken = createToken<IChatViewModel>('chatViewModel');
/**
 * 세션 목록 패널과 대화 탭 둘 다 이 하나를 본다. 대화는 세션 id로 고른다 — 탭마다 세션이 하나이고
 * 어느 탭이 열렸는지는 Shell이 알기 때문이다.
 *
 * atom은 React 경계를 넘지 않는다 — 관찰 property는 전부 값 그대로다.
 */
export interface IChatViewModel {
  /** `useViewModel`이 마운트에 자동으로 건다 — 세션 목록을 읽는다. */
  onMount(): void;
  onDispose(): void;

  readonly sessions: readonly ChatSessionRow[];
  readonly sessionsLoading: boolean;
  readonly sessionsFailure: string | null;

  /** 새 세션을 만들고 그 id를 돌려준다. 탭을 여는 것은 View의 몫이다(Shell의 `onOpenTab`). */
  createSession(): Promise<string | null>;
  archiveSession(id: string, archived: boolean): void;

  /** 대화 탭이 렌더마다 부른다 — 멱등이다. */
  openSession(id: string): void;
  /** 열린 적 없으면 빈 대화를 준다 — 탭이 뜨자마자 그릴 것이 있어야 한다. */
  chatOf(id: string): ChatState;
  setDraft(id: string, value: string): void;
  setMode(id: string, mode: 'action' | 'plan'): void;
  /** 초안을 보낸다. 보낼 수 없으면 아무 일도 없다. */
  submit(id: string): void;
  cancel(id: string): void;
}
