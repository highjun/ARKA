import type { Disposable } from "#core/di";
import type { Notification } from "../model/INotifications";

declare module "#core/di" {
  /** `INotificationViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.notificationViewModel": INotificationViewModel;
  }
}
/** 구석에 쌓인 알림. `INotifications`의 것을 그대로 내고, 닫는 것을 그쪽에 넘긴다. */
export interface INotificationViewModel extends Disposable {
  readonly items: readonly Notification[];
  dismiss(id: string): void;
}
