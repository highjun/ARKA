import type { Disposable } from "#core/di";
import type { Notification } from "../model/INotifications";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.notificationViewModel": INotificationViewModel;
  }
}

/** 알림 탭과 제목 줄의 종이 함께 쓴다. */
export interface INotificationViewModel extends Disposable {
  /** 오래된 것이 앞이다. */
  readonly items: readonly Notification[];
  /** 안 읽은 수. 종의 배지가 이 값이다. */
  readonly unreadCount: number;
  dismiss(id: string): void;
  markAllRead(): void;
  clear(): void;
}
