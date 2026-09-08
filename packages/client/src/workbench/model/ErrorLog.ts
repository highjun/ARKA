import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { ErrorEntry, IErrorLog } from './IErrorLog';

/** `IErrorLog`의 유일한 구현체. 최근 `MAX_ENTRIES`개만 남긴다. */
export class ErrorLog implements IErrorLog {
  static readonly MAX_ENTRIES = 50;

  readonly #now: () => number;
  readonly #changed = new Emitter();
  #entries: readonly ErrorEntry[] = [];

  constructor({ now = () => Date.now() }: { now?: () => number } = {}) {
    this.#now = now;
  }

  get entries(): readonly ErrorEntry[] {
    return this.#entries;
  }

  report(error: unknown, source: string): void {
    const entry = ErrorLog.#toEntry(error, source, this.#now());
    this.#entries = [...this.#entries, entry].slice(-ErrorLog.MAX_ENTRIES);
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  static #toEntry(error: unknown, source: string, time: number): ErrorEntry {
    if (error instanceof Error) {
      return { time, source, name: error.name, message: error.message, stack: error.stack };
    }
    return { time, source, name: 'NonError', message: String(error), stack: undefined };
  }
}
