import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IStorage } from "./IStorage";
import type { IColorMode, Mode } from "./IColorMode";

const isMode = (value: string): value is Mode => value === "light" || value === "dark";

export class ColorMode implements IColorMode {
  static readonly #KEY = "workbench.theme";

  readonly #storage: IStorage;
  readonly #changed = new Emitter();
  #mode: Mode;

  constructor({ storage }: { storage: IStorage }) {
    this.#storage = storage;
    const raw = storage.get(ColorMode.#KEY);
    this.#mode = raw !== null && isMode(raw) ? raw : "light";
  }

  get mode(): Mode {
    return this.#mode;
  }

  setMode(mode: Mode): void {
    if (this.#mode === mode) return;
    this.#mode = mode;
    this.#storage.set(ColorMode.#KEY, mode);
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
