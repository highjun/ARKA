import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import { Registry } from "#core/registry";
import type { ISettings, SettingsDescriptor, SettingsStore } from "./ISettings";

const conforms = (descriptor: SettingsDescriptor, value: unknown): boolean => {
  switch (descriptor.type) {
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number";
    case "string":
      return typeof value === "string";
    case "enum":
      return typeof value === "string" && descriptor.options.includes(value);
  }
};

export class Settings implements ISettings {
  readonly schema = new Registry<SettingsDescriptor>();
  readonly #store: SettingsStore;
  readonly #changed = new Emitter<string>();
  #values: Record<string, unknown>;

  constructor({ store }: { store: SettingsStore }) {
    this.#store = store;
    this.#values = { ...store.load() };
  }

  get<T>(id: string): T {
    const descriptor = this.schema.get(id);
    const stored = this.#values[id];
    return (conforms(descriptor, stored) ? stored : descriptor.default) as T;
  }

  set(id: string, value: unknown): void {
    this.schema.get(id);
    this.#values = { ...this.#values, [id]: value };
    this.#store.save(this.#values);
    this.#changed.fire(id);
  }

  onDidChange(listener: (id: string) => void): Disposable {
    return this.#changed.event(listener);
  }
}
