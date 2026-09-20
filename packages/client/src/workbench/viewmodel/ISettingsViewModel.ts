import type { Disposable } from "#core/di";

export interface SettingsRow {
  readonly id: string;
  readonly title: string;
  readonly type: "boolean" | "number" | "string" | "enum";
  readonly value: unknown;
  readonly options?: readonly string[];
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.settingsViewModel": ISettingsViewModel;
  }
}
export interface ISettingsViewModel extends Disposable {
  readonly rows: readonly SettingsRow[];
  set(id: string, value: unknown): void;
}
