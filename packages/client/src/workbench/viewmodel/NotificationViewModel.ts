import type { Disposable } from "#core/di";
import { makeAutoObservable, observableRef } from "mobx";
import type { INotifications, Notification } from "../model/INotifications";
import type { INotificationViewModel } from "./INotificationViewModel";

export class NotificationViewModel implements INotificationViewModel {
  readonly #notifications: INotifications;
  readonly #subscription: Disposable;
  private itemsState: readonly Notification[];

  constructor({ notifications }: { notifications: INotifications }) {
    this.#notifications = notifications;
    this.itemsState = notifications.items;
    makeAutoObservable<this, "itemsState">(this, { itemsState: observableRef }, { autoBind: true });
    this.#subscription = notifications.onDidChange(() => this.sync());
  }

  get items(): readonly Notification[] {
    return this.itemsState;
  }

  dismiss(id: string): void {
    this.#notifications.dismiss(id);
  }

  dispose(): void {
    this.#subscription.dispose();
  }

  private sync(): void {
    this.itemsState = this.#notifications.items;
  }
}
