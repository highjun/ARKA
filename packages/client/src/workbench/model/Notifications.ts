import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { INotifications, Notification, Severity } from "./INotifications";

/**
 * `INotifications`의 유일한 구현체.
 *
 * **상한이 다섯이었다가 풀렸다**(2026-09-20). 그때는 종을 누르면 뜨는 메뉴가 전부라 여섯째가
 * 오면 첫째가 조용히 사라져도 그만이었는데, 지금은 열어 보는 탭이 있어 그것이 말이 안 된다.
 * 그래도 바닥은 둔다 — 이보다 오래된 것은 읽을 일이 없고, 무한히 쌓이면 탭이 느려진다.
 */
export class Notifications implements INotifications {
  static readonly MAX = 200;

  readonly #newId: () => string;
  readonly #now: () => number;
  readonly #changed = new Emitter();
  #items: readonly Notification[] = [];

  /** `newId`·`now`를 받는 이유는 테스트가 식별자와 시각을 붙잡기 위해서다. */
  constructor({
    newId = () => crypto.randomUUID(),
    now = () => Date.now(),
  }: {
    newId?: () => string;
    now?: () => number;
  } = {}) {
    this.#newId = newId;
    this.#now = now;
  }

  /** 오래된 것부터 온다. 스스로 사라지는 것은 없다. */
  get items(): readonly Notification[] {
    return this.#items;
  }

  /** 안 읽은 수. */
  get unreadCount(): number {
    return this.#items.filter((n) => !n.isRead).length;
  }

  /**
   * 만든 알림의 id를 돌려준다 — 같은 것이 이미 있으면 그 id다.
   *
   * **이미 읽은 것과 같은 것이 또 오면 안 읽음으로 되돌리고 시각을 갱신한다.** 같은 오류가
   * 다시 났다는 것은 새 소식이다 — 한 번 읽었다고 조용히 넘기면 두 번째를 놓친다.
   */
  notify(severity: Severity, message: string): string {
    const same = this.#items.find((n) => n.severity === severity && n.message === message);
    if (same !== undefined) {
      if (!same.isRead) return same.id;
      this.#items = this.#items.map((n) => (n.id === same.id ? { ...n, isRead: false, at: this.#now() } : n));
      this.#changed.fire();
      return same.id;
    }
    const notification: Notification = { id: this.#newId(), severity, message, at: this.#now(), isRead: false };
    this.#items = [...this.#items, notification].slice(-Notifications.MAX);
    this.#changed.fire();
    return notification.id;
  }

  /** 없는 id면 조용히 넘어간다 — 두 번 닫아도 안전하다. */
  dismiss(id: string): void {
    const next = this.#items.filter((n) => n.id !== id);
    if (next.length === this.#items.length) return;
    this.#items = next;
    this.#changed.fire();
  }

  /** 다 읽은 상태면 아무 일도 안 한다 — 헛된 알림을 안 낸다. */
  markAllRead(): void {
    if (this.unreadCount === 0) return;
    this.#items = this.#items.map((n) => (n.isRead ? n : { ...n, isRead: true }));
    this.#changed.fire();
  }

  /** 이미 비었으면 아무 일도 안 한다. */
  clear(): void {
    if (this.#items.length === 0) return;
    this.#items = [];
    this.#changed.fire();
  }

  /** 무엇이 바뀌었는지는 주지 않는다 — 받는 쪽이 목록을 다시 읽는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
