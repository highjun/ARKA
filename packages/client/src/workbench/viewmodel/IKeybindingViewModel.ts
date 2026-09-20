import type { Disposable } from "#core/di";

export interface KeybindingRow {
  readonly actionId: string;
  readonly label: string;
  readonly keybinding: string;
  readonly isConflicting: boolean;
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.keybindingViewModel": IKeybindingViewModel;
  }
}
export interface IKeybindingViewModel extends Disposable {
  readonly rows: readonly KeybindingRow[];
}
