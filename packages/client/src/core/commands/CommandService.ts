import { Collection, DescriptorNotFoundError, Registry } from "#core/registry";
import type { ActionDescriptor, ContextDescriptor, Keybinding, MenuItem } from "./descriptors";
import type { ICommandService } from "./ICommandService";
import { normalizeKeybinding } from "./normalizeKeybinding";

export interface KeybindingOverridesStore {
  load(): Readonly<Record<string, string | null>>;
  save(overrides: Readonly<Record<string, string | null>>): void;
}

export class CommandService implements ICommandService {
  readonly actions = new Registry<ActionDescriptor>();
  readonly contexts = new Registry<ContextDescriptor>();
  readonly keybindings = new Collection<Keybinding>();
  readonly menus = new Collection<MenuItem>();
  readonly #overrides: Map<string, string | null>;
  readonly #store: KeybindingOverridesStore;
  readonly #reportError: (error: Error) => void;

  constructor({
    overridesStore,
    reportError,
  }: {
    overridesStore: KeybindingOverridesStore;
    reportError: (error: Error) => void;
  }) {
    this.#store = overridesStore;
    this.#reportError = reportError;
    this.#overrides = new Map(Object.entries(overridesStore.load()));
  }

  get overrides(): ReadonlyMap<string, string | null> {
    return this.#overrides;
  }

  setKeybinding(actionId: string, keybinding: string | null): void {
    this.#overrides.set(actionId, keybinding);
    this.#store.save(Object.fromEntries(this.#overrides));
  }

  matchKeybinding(event: KeyboardEvent): Keybinding | undefined {
    const pressed = normalizeKeybinding(event);
    for (const binding of this.keybindings.list()) {
      const effective = this.#overrides.has(binding.actionId)
        ? this.#overrides.get(binding.actionId)
        : binding.keybinding;
      if (effective !== pressed) continue;
      if (binding.when !== undefined && !binding.when(this.contexts)) continue;
      return { ...binding, keybinding: effective };
    }
    const bound = new Set(this.keybindings.list().map((binding) => binding.actionId));
    for (const [actionId, keybinding] of this.#overrides) {
      if (!bound.has(actionId) && keybinding === pressed) return { keybinding, actionId };
    }
    return undefined;
  }

  matchMenuItems(menuId: string): readonly MenuItem[] {
    return this.menus
      .entries()
      .filter(({ item }) => item.menuId === menuId && (item.when === undefined || item.when(this.contexts)))
      .sort((a, b) => {
        const byActivation = (a.activation?.index ?? -1) - (b.activation?.index ?? -1);
        return byActivation !== 0 ? byActivation : (a.item.order ?? 0) - (b.item.order ?? 0);
      })
      .map(({ item }) => item);
  }

  dispatchKeydown(event: KeyboardEvent): boolean {
    const matched = this.matchKeybinding(event);
    if (matched === undefined) return false;
    this.execute(matched.actionId);
    return true;
  }

  execute(actionId: string, context?: unknown): void {
    const action = this.actions.tryGet(actionId);
    if (action === undefined) {
      this.#reportError(new DescriptorNotFoundError(actionId));
      return;
    }
    try {
      action.execute(context);
    } catch (error) {
      this.#reportError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
