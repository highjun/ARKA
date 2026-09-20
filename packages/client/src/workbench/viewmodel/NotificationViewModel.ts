import type { Disposable } from "#core/di";
import { URI } from "#contracts";
import { makeAutoObservable, observableRef } from "mobx";
import type { ICommandService } from "#core/commands";
import type { INotifications, Notification } from "../model/INotifications";
import type { INotificationViewModel } from "./INotificationViewModel";

export class NotificationViewModel implements INotificationViewModel {
  readonly #notifications: INotifications;
  readonly #subscription: Disposable;
  private itemsState: readonly Notification[];
  private dismissedToastAt: ReadonlyMap<string, number> = new Map();

  constructor({ notifications, commands }: { notifications: INotifications; commands: ICommandService }) {
    this.#notifications = notifications;
    this.itemsState = notifications.items;
    makeAutoObservable<this, "itemsState" | "dismissedToastAt">(
      this,
      { itemsState: observableRef, dismissedToastAt: observableRef },
      { autoBind: true },
    );
    this.#subscription = notifications.onDidChange(() => this.sync());
    commands.actions.add({
      id: "shell.openNotifications",
      label: "알림 열기",
      execute: () => {
        commands.execute("arka.workbench.open", { uri: URI.parse("arka:///notifications") });
        this.clearToasts();
      },
    });
  }

  get items(): readonly Notification[] {
    return this.itemsState;
  }

  get unreadCount(): number {
    return this.itemsState.filter((n) => !n.isRead).length;
  }

  get toasts(): readonly Notification[] {
    return this.itemsState.filter((n) => !n.isRead && (this.dismissedToastAt.get(n.id) ?? -1) < n.at);
  }

  dismiss(id: string): void {
    this.#notifications.dismiss(id);
  }

  dismissToast(id: string): void {
    const item = this.itemsState.find((n) => n.id === id);
    if (item === undefined || this.dismissedToastAt.get(id) === item.at) return;
    this.dismissedToastAt = new Map([...this.dismissedToastAt, [id, item.at]]);
  }

  markRead(id: string): void {
    this.#notifications.markRead(id);
  }

  clear(): void {
    this.#notifications.clear();
  }

  private clearToasts(): void {
    const next = new Map(this.dismissedToastAt);
    for (const item of this.toasts) next.set(item.id, item.at);
    this.dismissedToastAt = next;
  }

  dispose(): void {
    this.#subscription.dispose();
  }

  private sync(): void {
    this.itemsState = this.#notifications.items;
  }
}
