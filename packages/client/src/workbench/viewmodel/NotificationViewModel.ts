import type { Disposable } from "#core/di";
import { makeAutoObservable, observableRef } from "mobx";
import type { INotifications, Notification } from "../model/INotifications";
import type { INotificationViewModel } from "./INotificationViewModel";

/** `INotificationViewModel`의 유일한 구현체. */
export class NotificationViewModel implements INotificationViewModel {
  readonly #notifications: INotifications;
  readonly #subscription: Disposable;
  private itemsState: readonly Notification[];

  /** Model을 구독해 목록을 값으로 옮긴다. */
  constructor({ notifications }: { notifications: INotifications }) {
    this.#notifications = notifications;
    this.itemsState = notifications.items;
    makeAutoObservable<this, "itemsState">(this, { itemsState: observableRef }, { autoBind: true });
    this.#subscription = notifications.onDidChange(() => this.sync());
  }

  /** 오래된 것이 앞이다. */
  get items(): readonly Notification[] {
    return this.itemsState;
  }

  /** 없는 id면 조용히 넘어간다. */
  dismiss(id: string): void {
    this.#notifications.dismiss(id);
  }

  /** 구독을 끊는다. */
  dispose(): void {
    this.#subscription.dispose();
  }

  private sync(): void {
    this.itemsState = this.#notifications.items;
  }
}
