import type { Disposable } from "#core/di";

export type Listener<T> = (value: T) => void;

/**
 * Model이 "무슨 일이 있었다"를 알리는 통로.
 *
 * Model은 상태 라이브러리를 몰라야 한다 — 값은 getter로, 변화는 이 이벤트로 낸다. atom을
 * 갖는 건 ViewModel의 일이고, ViewModel이 이 이벤트를 받아 자기 atom을 갱신한다.
 */
export class Emitter<T = void> {
  readonly #listeners = new Set<Listener<T>>();

  /** 구독한다. 돌려받은 `dispose()`를 부르면 끊긴다. */
  readonly event = (listener: Listener<T>): Disposable => {
    this.#listeners.add(listener);
    return {
      dispose: () => {
        this.#listeners.delete(listener);
      },
    };
  };

  /**
   * 구독자를 부른다.
   *
   * 목록을 복사해서 돈다 — 리스너가 도중에 구독을 끊어도 순회가 깨지지 않는다.
   */
  fire(value: T): void {
    for (const listener of [...this.#listeners]) {
      listener(value);
    }
  }

  dispose(): void {
    this.#listeners.clear();
  }
}
