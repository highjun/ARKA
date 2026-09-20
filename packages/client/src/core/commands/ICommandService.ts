import type { Collection, Registry } from "#core/registry";
import type { ActionDescriptor, ContextDescriptor, Keybinding, MenuItem } from "./descriptors";

declare module "#core/di" {
  interface InstanceMap {
    "arka.commands": ICommandService;
  }
}

export interface ICommandService {
  readonly actions: Registry<ActionDescriptor>;
  readonly contexts: Registry<ContextDescriptor>;
  readonly keybindings: Collection<Keybinding>;
  readonly menus: Collection<MenuItem>;

  readonly overrides: ReadonlyMap<string, string | null>;
  setKeybinding(actionId: string, keybinding: string | null): void;

  matchKeybinding(event: KeyboardEvent): Keybinding | undefined;
  matchMenuItems(menuId: string): readonly MenuItem[];

  dispatchKeydown(event: KeyboardEvent): boolean;
  execute(actionId: string, context?: unknown): void;
}
