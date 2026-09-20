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
  /**
   * 지금 구석에 떠 있어야 하는 것들. **안 읽었고 토스트를 아직 안 닫은 것**이다 —
   * 탭을 열면 다 읽음이 되므로 떠 있던 것도 함께 걷힌다.
   */
  readonly toasts: readonly Notification[];
  dismiss(id: string): void;
  /** 토스트만 닫는다 — 목록에는 남는다. */
  dismissToast(id: string): void;
  markAllRead(): void;
  clear(): void;
}
