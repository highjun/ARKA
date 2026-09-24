import type { Disposable } from "#core/di";

export type Severity = "info" | "warning" | "error";

/** 알림에 붙는 단추 하나 — 누르면 `run`이 돈다. */
interface NotificationAction {
  readonly label: string;
  readonly run: () => void;
}

export interface Notification {
  readonly id: string;
  readonly severity: Severity;
  readonly message: string;
  readonly at: number;
  readonly isRead: boolean;
  readonly timeout?: number;
  readonly action?: NotificationAction;
}

export interface NotifyOptions {
  readonly timeout?: number;
  readonly action?: NotificationAction;
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.notifications": INotifications;
  }
}

export interface INotifications {
  readonly items: readonly Notification[];
  readonly unreadCount: number;
  notify(severity: Severity, message: string, options?: NotifyOptions): string;
  dismiss(id: string): void;
  markRead(id: string): void;
  clear(): void;
  onDidChange(listener: () => void): Disposable;
}
