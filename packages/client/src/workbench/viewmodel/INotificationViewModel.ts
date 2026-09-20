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
   * 지금 구석에 떠 있어야 하는 것들. **안 읽었고 토스트가 아직 안 걷힌 것**이다 —
   * 누르면 읽음이 되어 여기서 빠진다.
   */
  readonly toasts: readonly Notification[];
  dismiss(id: string): void;
  /**
   * 토스트만 걷는다 — 목록에 안 읽음으로 남는다. 시간이 다 됐을 때 부른다.
   *
   * 탭을 열면 떠 있던 것이 전부 이렇게 걷힌다 — 구석과 목록에 같은 것이 겹쳐 보이지 않게.
   */
  dismissToast(id: string): void;
  /** 하나를 읽음으로. 누른 것이 읽은 것이다. */
  markRead(id: string): void;
  clear(): void;
}
