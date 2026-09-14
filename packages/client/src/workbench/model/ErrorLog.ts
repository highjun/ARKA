import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { ErrorEntry, IErrorLog } from "./IErrorLog";

/** `IErrorLog`의 유일한 구현체. 최근 `MAX_ENTRIES`개만 남긴다. */
export class ErrorLog implements IErrorLog {
  static readonly MAX_ENTRIES = 50;

  readonly #now: () => number;
  readonly #changed = new Emitter();
  #entries: readonly ErrorEntry[] = [];

  /** `now`를 받는 이유는 테스트가 시각을 붙잡기 위해서다. */
  constructor({ now = () => Date.now() }: { now?: () => number } = {}) {
    this.#now = now;
  }

  /** 오래된 것부터 온다. 상한을 넘으면 앞에서부터 잘린다. */
  get entries(): readonly ErrorEntry[] {
    return this.#entries;
  }

  /** `Error`가 아닌 것도 받는다 — 감싸서 담고, 담을 때마다 구독자에게 알린다. */
  report(error: unknown, source: string): void {
    const entry = ErrorLog.#toEntry(error, source, this.#now());
    this.#entries = [...this.#entries, entry].slice(-ErrorLog.MAX_ENTRIES);
    this.#changed.fire();
  }

  /** 무엇이 바뀌었는지는 주지 않는다 — 받는 쪽이 `entries`를 다시 읽는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  static #toEntry(error: unknown, source: string, time: number): ErrorEntry {
    if (error instanceof Error) {
      return { time, source, name: error.name, message: error.message, stack: error.stack };
    }
    return { time, source, name: "NonError", message: String(error), stack: undefined };
  }
}
