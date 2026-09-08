import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { INotificationService, Notification, NotificationSeverity } from './INotificationService';

/** `INotificationService`의 유일한 구현체. 최근 `MAX`개만 남긴다 — 그 이상은 어차피 못 읽는다. */
export class NotificationService implements INotificationService {
  static readonly MAX = 5;

  readonly #now: () => number;
  readonly #newId: () => string;
  readonly #changed = new Emitter();
  #notifications: readonly Notification[] = [];

  constructor({ now = () => Date.now(), newId = () => crypto.randomUUID() }: { now?: () => number; newId?: () => string } = {}) {
    this.#now = now;
    this.#newId = newId;
  }

  get notifications(): readonly Notification[] {
    return this.#notifications;
  }

  notify(severity: NotificationSeverity, message: string): string {
    const same = this.#notifications.find((n) => n.severity === severity && n.message === message);
    if (same !== undefined) return same.id;
    const notification: Notification = { id: this.#newId(), severity, message, at: this.#now() };
    this.#notifications = [...this.#notifications, notification].slice(-NotificationService.MAX);
    this.#changed.fire();
    return notification.id;
  }

  dismiss(id: string): void {
    const next = this.#notifications.filter((n) => n.id !== id);
    if (next.length === this.#notifications.length) return;
    this.#notifications = next;
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
