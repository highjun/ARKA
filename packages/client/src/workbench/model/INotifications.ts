import type { Disposable } from "#core/di";

export type Severity = "info" | "warning" | "error";

export interface Notification {
  readonly id: string;
  readonly severity: Severity;
  readonly message: string;
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.notifications": INotifications;
  }
}
export interface INotifications {
  readonly items: readonly Notification[];
  notify(severity: Severity, message: string): string;
  dismiss(id: string): void;
  onDidChange(listener: () => void): Disposable;
}
