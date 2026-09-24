import type { Disposable } from "#core/di";

export type { CommandRow } from "../row/commandRows";
import type { CommandRow } from "../row/commandRows";

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
