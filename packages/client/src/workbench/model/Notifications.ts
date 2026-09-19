import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { INotifications, Notification, Severity } from "./INotifications";

/** `INotifications`의 유일한 구현체. 최근 `MAX`개만 남긴다 — 그 이상은 어차피 못 읽는다. */
export class Notifications implements INotifications {
  static readonly MAX = 5;

  readonly #newId: () => string;
  readonly #changed = new Emitter();
  #items: readonly Notification[] = [];

  /** `newId`를 받는 이유는 테스트가 식별자를 붙잡기 위해서다. */
  constructor({ newId = () => crypto.randomUUID() }: { newId?: () => string } = {}) {
    this.#newId = newId;
  }

  /** 오래된 것부터 온다. 스스로 사라지는 것은 없다. */
  get items(): readonly Notification[] {
    return this.#items;
  }

  /** 만든 알림의 id를 돌려준다 — 같은 것이 이미 있으면 그 id다. */
  notify(severity: Severity, message: string): string {
    const same = this.#items.find((n) => n.severity === severity && n.message === message);
    if (same !== undefined) return same.id;
    const notification: Notification = { id: this.#newId(), severity, message };
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

  /** 무엇이 바뀌었는지는 주지 않는다 — 받는 쪽이 목록을 다시 읽는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
