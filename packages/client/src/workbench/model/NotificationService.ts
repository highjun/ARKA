import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { INotificationService, Notification, NotificationSeverity } from "./INotificationService";

/** `INotificationService`의 유일한 구현체. 최근 `MAX`개만 남긴다 — 그 이상은 어차피 못 읽는다. */
export class NotificationService implements INotificationService {
  static readonly MAX = 5;

  readonly #now: () => number;
  readonly #newId: () => string;
  readonly #changed = new Emitter();
  #notifications: readonly Notification[] = [];

  /** `now`·`newId`를 받는 이유는 테스트가 시각과 식별자를 붙잡기 위해서다. */
  constructor({
    now = () => Date.now(),
    newId = () => crypto.randomUUID(),
  }: { now?: () => number; newId?: () => string } = {}) {
    this.#now = now;
    this.#newId = newId;
  }

  /** 오래된 것부터 온다. 스스로 사라지는 것은 없다. */
  get notifications(): readonly Notification[] {
    return this.#notifications;
  }

  /** 만든 알림의 id를 돌려준다 — 나중에 `dismiss`로 지목할 수 있게. */
  notify(severity: NotificationSeverity, message: string): string {
    const same = this.#notifications.find((n) => n.severity === severity && n.message === message);
    if (same !== undefined) return same.id;
    const notification: Notification = { id: this.#newId(), severity, message, at: this.#now() };
    this.#notifications = [...this.#notifications, notification].slice(-NotificationService.MAX);
    this.#changed.fire();
    return notification.id;
  }

  /** 없는 id면 조용히 넘어간다 — 두 번 닫아도 안전하다. */
  dismiss(id: string): void {
    const next = this.#notifications.filter((n) => n.id !== id);
    if (next.length === this.#notifications.length) return;
    this.#notifications = next;
    this.#changed.fire();
  }

  /** 무엇이 바뀌었는지는 주지 않는다 — 받는 쪽이 목록을 다시 읽는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
