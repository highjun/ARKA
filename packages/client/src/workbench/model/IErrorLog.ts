import { createToken, type Disposable } from '#core/di';

/** 잡힌 오류 하나. 원본 `Error`를 그대로 두지 않고 값만 옮긴다 — 화면이 참조를 오래 쥐지 않게. */
export type ErrorEntry = {
  /** `Date.now()` 값. */
  readonly time: number;
  /** 어디서 잡혔는지 — `render`, `window.error`, `unhandledrejection` 등. */
  readonly source: string;
  readonly name: string;
  readonly message: string;
  readonly stack: string | undefined;
};

export const ErrorLogToken = createToken<IErrorLog>('errorLog');
/**
 * 아무도 잡지 않은 오류가 마지막으로 닿는 자리. VSCode의 `onUnexpectedError`에 해당한다.
 *
 * 화면이 죽어도 아무도 모른다는 문제를 푸는 첫 조각이다 — 기록이 남아야 알림이든 서버 전송이든
 * 그 위에 얹을 수 있다. 기록은 메모리에만 두고 개수를 제한한다.
 */
export interface IErrorLog {
  /** 최근 것이 마지막이다. `MAX_ENTRIES`를 넘으면 오래된 것부터 버린다. */
  readonly entries: readonly ErrorEntry[];
  /** `Error`가 아닌 값도 받는다 — `throw 'string'`이나 `reject(undefined)`도 오류다. */
  report(error: unknown, source: string): void;
  /** `entries`가 바뀔 때마다 부른다. 구독은 `dispose()`로 끊는다. */
  onDidChange(listener: () => void): Disposable;
}
