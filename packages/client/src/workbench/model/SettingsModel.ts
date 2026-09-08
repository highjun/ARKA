import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { Density, ISettingsModel, Settings } from './ISettingsModel';
import type { IStorage } from './IStorage';

const DEFAULTS: Settings = { density: 'auto' };
const isDensity = (value: unknown): value is Density => value === 'auto' || value === 'compact' || value === 'touch';

/** `ISettingsModel`의 유일한 구현체. 저장된 값이 깨져 있으면 기본값으로 돌아간다. */
export class SettingsModel implements ISettingsModel {
  static readonly #KEY = 'workbench.settings';

  readonly #storage: IStorage;
  readonly #changed = new Emitter();
  #settings: Settings;

  constructor({ storage }: { storage: IStorage }) {
    this.#storage = storage;
    this.#settings = SettingsModel.#restore(storage);
  }

  get settings(): Settings {
    return this.#settings;
  }

  update(patch: Partial<Settings>): void {
    const next: Settings = { ...this.#settings, ...(patch.density !== undefined ? { density: patch.density } : {}) };
    if (next.density === this.#settings.density) return;
    this.#settings = next;
    this.#storage.set(SettingsModel.#KEY, JSON.stringify(next));
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  static #restore(storage: IStorage): Settings {
    const raw = storage.get(SettingsModel.#KEY);
    if (raw === null) return DEFAULTS;
    try {
      const parsed = JSON.parse(raw) as { density?: unknown };
      return { density: isDensity(parsed.density) ? parsed.density : DEFAULTS.density };
    } catch {
      return DEFAULTS;
    }
  }
}
