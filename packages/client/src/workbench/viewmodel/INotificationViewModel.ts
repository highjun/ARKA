import type { Disposable } from "#core/di";
import type { Notification } from "../model/INotifications";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.notificationViewModel": INotificationViewModel;
  }
}
export interface INotificationViewModel extends Disposable {
  readonly items: readonly Notification[];
  dismiss(id: string): void;
}
