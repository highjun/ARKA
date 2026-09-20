import type { Descriptor, Registry } from "#core/registry";

export interface ActionDescriptor<TContext = unknown> extends Descriptor {
  readonly label: string;
  readonly execute: (context: TContext) => void;
}

export interface ContextDescriptor extends Descriptor {
  readonly value: () => unknown;
}

export interface Keybinding {
  readonly keybinding: string;
  readonly actionId: string;
  readonly when?: (ctx: Registry<ContextDescriptor>) => boolean;
}

export interface MenuItem {
  readonly menuId: string;
  readonly actionId: string;
  readonly when?: (ctx: Registry<ContextDescriptor>) => boolean;
  readonly order?: number;
}
