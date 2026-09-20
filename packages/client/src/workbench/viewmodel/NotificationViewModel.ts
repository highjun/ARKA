import type { Disposable } from "#core/di";
import { URI } from "#contracts";
import { makeAutoObservable, observableRef } from "mobx";
import type { ICommandService } from "#core/commands";
import type { INotifications, Notification } from "../model/INotifications";
import type { INotificationViewModel } from "./INotificationViewModel";

/** `INotificationViewModel`의 유일한 구현체. */
export class NotificationViewModel implements INotificationViewModel {
  readonly #notifications: INotifications;
  readonly #subscription: Disposable;
  private itemsState: readonly Notification[];
  /**
   * 구석에서 걷힌 토스트의 id와 그때의 `at`. 목록에서 지우는 것이 아니라 **구석에서만 걷는 것**이다.
   *
   * **`at`을 함께 두는 까닭:** 같은 것이 다시 오면 Model이 `at`을 갱신한다. 그때 다시 떠야
   * 하는데, id만 들고 있으면 한 번 걷힌 것이 두 번째 소식에도 조용하다.
   */
  private dismissedToastAt: ReadonlyMap<string, number> = new Map();

  /**
   * Model을 구독해 목록을 값으로 옮기고, **여는 명령을 스스로 등록한다** — 팔레트와 같은 방식이다.
   *
   * **여는 것은 읽는 것이 아니다** — 읽음은 줄을 누를 때 낱개로 된다.
   */
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

  /** 오래된 것이 앞이다. */
  get items(): readonly Notification[] {
    return this.itemsState;
  }

  /** 안 읽은 수. **목록에서 센다** — Model을 다시 묻지 않아야 observable 한 벌로 화면이 따라온다. */
  get unreadCount(): number {
    return this.itemsState.filter((n) => !n.isRead).length;
  }

  /** 안 읽었고 토스트가 아직 안 걷힌 것. 걷힌 뒤에 다시 온 것은 `at`이 새것이라 또 뜬다. */
  get toasts(): readonly Notification[] {
    return this.itemsState.filter((n) => !n.isRead && (this.dismissedToastAt.get(n.id) ?? -1) < n.at);
  }

  /** 없는 id면 조용히 넘어간다. */
  dismiss(id: string): void {
    this.#notifications.dismiss(id);
  }

  /** 두 번 걷어도 안전하다. 없는 id면 아무 일도 없다. */
  dismissToast(id: string): void {
    const item = this.itemsState.find((n) => n.id === id);
    if (item === undefined || this.dismissedToastAt.get(id) === item.at) return;
    this.dismissedToastAt = new Map([...this.dismissedToastAt, [id, item.at]]);
  }

  /** 누른 것이 읽은 것이다. */
  markRead(id: string): void {
    this.#notifications.markRead(id);
  }

  /** 목록을 비운다. */
  clear(): void {
    this.#notifications.clear();
  }

  /**
   * 떠 있는 것을 전부 걷는다 — **읽음이 아니다.** 탭을 여는 순간 부른다: 같은 것이 구석과
   * 목록에 겹쳐 보이면 둘 중 하나는 군더더기다.
   */
  private clearToasts(): void {
    const next = new Map(this.dismissedToastAt);
    for (const item of this.toasts) next.set(item.id, item.at);
    this.dismissedToastAt = next;
  }

  /** 구독을 끊는다. */
  dispose(): void {
    this.#subscription.dispose();
  }

  private sync(): void {
    this.itemsState = this.#notifications.items;
  }
}
