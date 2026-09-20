import type { Disposable } from "#core/di";

type Listener<T> = (value: T) => void;

export class Emitter<T = void> {
  readonly #listeners = new Set<Listener<T>>();

  readonly event = (listener: Listener<T>): Disposable => {
    this.#listeners.add(listener);
    return {
      dispose: () => {
        this.#listeners.delete(listener);
      },
    };
  };

  fire(value: T): void {
    for (const listener of [...this.#listeners]) {
      listener(value);
    }
  }

  dispose(): void {
    this.#listeners.clear();
  }
}
