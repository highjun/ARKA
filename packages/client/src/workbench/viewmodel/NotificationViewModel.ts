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
  /** 화면에서 닫은 토스트의 id. 목록에서 지우는 것이 아니라 **구석에서만 걷는 것**이다. */
  private dismissedToastIds: readonly string[] = [];

  /**
   * Model을 구독해 목록을 값으로 옮기고, **여는 명령을 스스로 등록한다** — 팔레트와 같은 방식이다.
   *
   * 읽음 처리가 여기 붙는 까닭: `view/`는 효과를 못 쓰고(→ ADR 0007), 여는 길이 명령 하나라
   * **열리는 순간이 곧 이 함수가 도는 순간**이다.
   */
  constructor({ notifications, commands }: { notifications: INotifications; commands: ICommandService }) {
    this.#notifications = notifications;
    this.itemsState = notifications.items;
    makeAutoObservable<this, "itemsState" | "dismissedToastIds">(
      this,
      { itemsState: observableRef, dismissedToastIds: observableRef },
      { autoBind: true },
    );
    this.#subscription = notifications.onDidChange(() => this.sync());
    commands.actions.add({
      id: "shell.openNotifications",
      label: "알림 열기",
      execute: () => {
        commands.execute("arka.workbench.open", { uri: URI.parse("arka:///notifications") });
        this.markAllRead();
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

  /** 안 읽었고 아직 안 닫은 것. */
  get toasts(): readonly Notification[] {
    return this.itemsState.filter((n) => !n.isRead && !this.dismissedToastIds.includes(n.id));
  }

  /** 없는 id면 조용히 넘어간다. */
  dismiss(id: string): void {
    this.#notifications.dismiss(id);
  }

  /** 두 번 닫아도 안전하다. */
  dismissToast(id: string): void {
    if (this.dismissedToastIds.includes(id)) return;
    this.dismissedToastIds = [...this.dismissedToastIds, id];
  }

  /** 목록을 여는 순간 부른다 — 여는 명령이 부른다. */
  markAllRead(): void {
    this.#notifications.markAllRead();
  }

  /** 목록을 비운다. */
  clear(): void {
    this.#notifications.clear();
  }

  /** 구독을 끊는다. */
  dispose(): void {
    this.#subscription.dispose();
  }

  private sync(): void {
    this.itemsState = this.#notifications.items;
  }
}
