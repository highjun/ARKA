import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { INotifications, Notification, NotifyOptions, Severity } from "./INotifications";

export class Notifications implements INotifications {
  static readonly MAX = 200;

  readonly #newId: () => string;
  readonly #now: () => number;
  readonly #changed = new Emitter();
  #items: readonly Notification[] = [];

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

  get items(): readonly Notification[] {
    return this.#items;
  }

  get unreadCount(): number {
    return this.#items.filter((n) => !n.isRead).length;
  }

  notify(severity: Severity, message: string, options?: NotifyOptions): string {
    const same = this.#items.find((n) => n.severity === severity && n.message === message);
    if (same !== undefined) {
      if (!same.isRead) return same.id;
      this.#items = this.#items.map((n) => (n.id === same.id ? { ...n, isRead: false, at: this.#now() } : n));
      this.#changed.fire();
      return same.id;
    }
    const notification: Notification = {
      id: this.#newId(),
      severity,
      message,
      at: this.#now(),
      isRead: false,
      ...(options?.timeout === undefined ? {} : { timeout: options.timeout }),
    };
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

  markRead(id: string): void {
    if (!this.#items.some((n) => n.id === id && !n.isRead)) return;
    this.#items = this.#items.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    this.#changed.fire();
  }

  clear(): void {
    if (this.#items.length === 0) return;
    this.#items = [];
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
