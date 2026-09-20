import type { Disposable } from "#core/di";

export type Severity = "info" | "warning" | "error";

export interface Notification {
  readonly id: string;
  readonly severity: Severity;
  readonly message: string;
  readonly at: number;
  readonly isRead: boolean;
  readonly timeout?: number;
}

export interface NotifyOptions {
  readonly timeout?: number;
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
