import { createRegistry } from "#core/registry";
import { matchKeybinding } from "#core/menu";
import type {
  ICommandCenterRegistry,
  CommandDescriptor,
  CommandRegistry,
  ContextDescriptor,
  ContextRegistry,
  KeybindingDescriptor,
  KeybindingRegistry,
  MenuItemDescriptor,
  MenuRegistry,
} from "./ICommandCenterRegistry";

/** `ICommandCenterRegistry`의 유일한 구현체 — 네 레지스트리 모두 `core`의 `createRegistry()`로 만든다. */
export class CommandCenterRegistry implements ICommandCenterRegistry {
  readonly #commands: CommandRegistry = createRegistry();
  readonly #contexts: ContextRegistry = createRegistry();
  readonly #keybindings: KeybindingRegistry = createRegistry();
  readonly #menus: MenuRegistry = createRegistry();

  /** `#commands`를 그대로 노출한다. */
  get commandRegistry(): CommandRegistry {
    return this.#commands;
  }

  /** `#contexts`를 그대로 노출한다. */
  get contextRegistry(): ContextRegistry {
    return this.#contexts;
  }

  /** `#keybindings`를 그대로 노출한다. */
  get keybindingRegistry(): KeybindingRegistry {
    return this.#keybindings;
  }

  /** `#menus`를 그대로 노출한다. */
  get menuRegistry(): MenuRegistry {
    return this.#menus;
  }

  /** `#commands.add`에 위임한다. */
  registerCommand(descriptor: CommandDescriptor): void {
    this.#commands.add(descriptor);
  }

  /** `#contexts.add`에 위임한다. */
  registerContext(descriptor: ContextDescriptor): void {
    this.#contexts.add(descriptor);
  }

  /** `#keybindings.add`에 위임한다. */
  registerKeybinding(descriptor: KeybindingDescriptor): void {
    this.#keybindings.add(descriptor);
  }

  /** `#menus.add`에 위임한다. */
  registerMenuItem(descriptor: MenuItemDescriptor): void {
    this.#menus.add(descriptor);
  }

  /** `matchKeybinding`으로 찾은 커맨드를 `#commands`에서 조회해 실행한다. */
  dispatchKeydown(pressed: string): boolean {
    const matched = matchKeybinding(this.#keybindings, this.#contexts, pressed);
    if (matched === undefined) return false;

    const command = this.#commands.tryGet(matched.actionId);
    if (command === undefined) return false;

    command.execute(undefined);
    return true;
  }
}
