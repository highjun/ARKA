import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IStorage } from "./IStorage";
import type { IColorMode, Mode } from "./IColorMode";

const isMode = (value: string): value is Mode => value === "light" || value === "dark";

/** `IColorMode`의 유일한 구현체 — 생성자에서 `IStorage`로부터 저장된 값을 복원한다. */
export class ColorMode implements IColorMode {
  static readonly #KEY = "workbench.theme";

  readonly #storage: IStorage;
  readonly #changed = new Emitter();
  #mode: Mode;

  /** 생성 시점에 저장된 값을 복원한다 — 부팅에서 따로 되돌릴 것이 없다. */
  constructor({ storage }: { storage: IStorage }) {
    this.#storage = storage;
    const raw = storage.get(ColorMode.#KEY);
    this.#mode = raw !== null && isMode(raw) ? raw : "light";
  }

  /** `#mode`를 그대로 노출한다. */
  get mode(): Mode {
    return this.#mode;
  }

  /** `#mode`에 반영하고 `IStorage`에 지속한다. */
  setMode(mode: Mode): void {
    if (this.#mode === mode) return;
    this.#mode = mode;
    this.#storage.set(ColorMode.#KEY, mode);
    this.#changed.fire();
  }

  /** 상태가 바뀔 때마다 부른다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
