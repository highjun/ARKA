import type { Disposable } from "#core/di";
import type { Descriptor, Registry } from "#core/registry";

export type SettingsDescriptor = Descriptor & {
  readonly title: string;
  readonly category?: string;
  readonly description?: string;
  readonly byViewportWidth?: boolean;
} & (
    | { readonly type: "boolean"; readonly default: boolean }
    | { readonly type: "number"; readonly default: number }
    | { readonly type: "string"; readonly default: string }
    | { readonly type: "enum"; readonly default: string; readonly options: readonly string[] }
  );

export interface SettingsStore {
  load(): Readonly<Record<string, unknown>>;
  save(values: Readonly<Record<string, unknown>>): void;
}

export interface ISettings {
  readonly schema: Registry<SettingsDescriptor>;
  get<T>(id: string): T;
  set(id: string, value: unknown): void;
  onDidChange(listener: (id: string) => void): Disposable;
}
