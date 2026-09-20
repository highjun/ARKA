import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { INotifications, Notification, Severity } from "./INotifications";

export class Notifications implements INotifications {
  static readonly MAX = 5;

  readonly #newId: () => string;
  readonly #changed = new Emitter();
  #items: readonly Notification[] = [];

  constructor({ newId = () => crypto.randomUUID() }: { newId?: () => string } = {}) {
    this.#newId = newId;
  }

  get items(): readonly Notification[] {
    return this.#items;
  }

  notify(severity: Severity, message: string): string {
    const same = this.#items.find((n) => n.severity === severity && n.message === message);
    if (same !== undefined) return same.id;
    const notification: Notification = { id: this.#newId(), severity, message };
    this.#items = [...this.#items, notification].slice(-Notifications.MAX);
    this.#changed.fire();
    return notification.id;
  }

  dismiss(id: string): void {
    const next = this.#items.filter((n) => n.id !== id);
    if (next.length === this.#items.length) return;
    this.#items = next;
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
