import type { Disposable } from "#core/di";

export interface CommandRow {
  readonly id: string;
  readonly label: string;
  readonly keybinding: string;
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.commandPaletteViewModel": ICommandPaletteViewModel;
  }
}
export interface ICommandPaletteViewModel extends Disposable {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  readonly query: string;
  setQuery(value: string): void;
  readonly rows: readonly CommandRow[];
  readonly keybinding: string;
  run(actionId: string): void;
}
