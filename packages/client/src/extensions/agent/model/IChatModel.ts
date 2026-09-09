import { createToken, type Disposable } from '#core/di';
import type { AgentSession, RunId, RunMode, RunStatus, SessionId } from '#contracts';

/**
 * 이벤트 로그를 화면이 읽을 수 있는 대화로 접은 것 — **투영**이다. 원본은 서버의 이벤트다.
 * `id`는 이벤트가 준 식별자(messageId·blockId·callId)라 조각(delta)이 같은 항목에 이어 붙는다.
 */
export type TranscriptItem =
  | { readonly kind: 'user'; readonly id: string; readonly text: string; readonly at: number }
  | { readonly kind: 'assistant'; readonly id: string; readonly text: string; readonly done: boolean; readonly at: number }
  | { readonly kind: 'thinking'; readonly id: string; readonly text: string; readonly done: boolean; readonly at: number }
  | {
      readonly kind: 'tool';
      readonly id: string;
      readonly toolId: string;
      readonly input: unknown;
      readonly output: unknown;
      readonly isError: boolean;
      readonly done: boolean;
      readonly at: number;
    }
  | { readonly kind: 'error'; readonly id: string; readonly message: string; readonly at: number };

/** 에이전트가 사용자에게 물어 멈춘 상태. `send`가 이것을 답으로 보낸다. */
export type PendingInput = {
  readonly runId: RunId;
  readonly requestId: string;
  readonly prompt: string;
};

/** 스트림 연결 상태. `live`는 붙어 있다는 뜻이지 Run이 돈다는 뜻이 아니다(그건 `runStatus`). */
export type ChatConnection = 'idle' | 'connecting' | 'live' | 'error';

export type SessionChat = {
  readonly sessionId: SessionId;
  readonly items: readonly TranscriptItem[];
  /** 마지막 Run의 상태. Run이 없으면 `null`. */
  readonly runStatus: RunStatus | null;
  /** 지금 도는(또는 입력을 기다리는) Run. 없으면 `null`. */
  readonly activeRunId: RunId | null;
  readonly pendingInput: PendingInput | null;
  /** 마지막으로 접은 이벤트의 `seq`. 재연결이 여기서 이어 받는다. */
  readonly lastSeq: number;
  readonly connection: ChatConnection;
  /** 마지막 요청(보내기·끊기)의 실패 이유. 다음 요청이 성공하면 지운다. */
  readonly failure: string | null;
};

export type SessionsStatus = 'idle' | 'loading' | 'loaded' | 'error';

export const ChatModelToken = createToken<IChatModel>('chatModel');
/**
 * 세션 목록과, 열어 둔 세션들의 대화(투영)를 소유한다. VSCode의 `IChatService`에 해당한다.
 *
 * 세션은 여럿을 동시에 열 수 있다 — 탭마다 하나다. `open`은 멱등이라 View가 렌더마다 불러도 된다.
 */
export interface IChatModel {
  readonly sessions: readonly AgentSession[];
  readonly sessionsStatus: SessionsStatus;
  readonly sessionsFailure: string | null;
  /** 세션 id → 대화. `open`한 것만 있다. */
  readonly chats: Readonly<Record<SessionId, SessionChat>>;

  /** 목록을 읽는다. 실패하면 `sessionsStatus`가 `error`가 되고 던지지 않는다. */
  loadSessions(): Promise<void>;
  /**
   * 새 세션을 만들어 목록 맨 앞에 넣고 돌려준다.
   * @throws Error 서버가 거부하면 — 화면이 사유를 보여준다.
   */
  createSession(): Promise<AgentSession>;
  renameSession(id: SessionId, title: string): Promise<void>;
  archiveSession(id: SessionId, archived: boolean): Promise<void>;

  /** 대화를 열고 이벤트를 이어 받기 시작한다. 이미 열려 있으면 아무 일도 없다. */
  open(sessionId: SessionId): void;
  /** 스트림을 끊고 투영을 버린다. 다시 열면 처음부터 받는다. */
  close(sessionId: SessionId): void;
  /**
   * 텍스트를 보낸다 — 입력을 기다리는 중이면 그 답으로, 아니면 새 Run으로. 도는 Run이 있으면 아무 일도
   * 없다. 실패는 `chats[id].failure`에 남기고 던지지 않는다.
   */
  send(sessionId: SessionId, text: string, mode: RunMode): Promise<void>;
  /** 새 Run에 실을 옵션 — 파일 변경 전 확인 여부. 조립부가 설정에서 읽어 넣는다. */
  readonly confirmWrites: () => boolean;
  /** 도는 Run을 끊는다. 없으면 아무 일도 없다. */
  cancel(sessionId: SessionId): Promise<void>;

  /** 목록이나 어느 대화든 바뀌면 부른다. */
  onDidChange(listener: () => void): Disposable;
}
