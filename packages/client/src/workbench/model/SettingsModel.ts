import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { Density, ISettingsModel, Settings } from './ISettingsModel';
import type { IStorage } from './IStorage';

const DEFAULTS: Settings = { density: 'auto', agentConfirmWrites: true };
const isDensity = (value: unknown): value is Density => value === 'auto' || value === 'compact' || value === 'touch';

/** `ISettingsModel`의 유일한 구현체. 저장된 값이 깨져 있으면 기본값으로 돌아간다. */
export class SettingsModel implements ISettingsModel {
  static readonly #KEY = 'workbench.settings';

  readonly #storage: IStorage;
  readonly #changed = new Emitter();
  #settings: Settings;

  /** 생성 시점에 저장된 값을 복원한다 — 부팅 뒤 따로 부를 것이 없다. */
  constructor({ storage }: { storage: IStorage }) {
    this.#storage = storage;
    this.#settings = SettingsModel.#restore(storage);
  }

  /** 언제나 전부 채워진 값이다 — 저장소가 비어 있으면 기본값이 온다. */
  get settings(): Settings {
    return this.#settings;
  }

  /** 준 필드만 덮어쓰고 곧바로 저장한다. */
  update(patch: Partial<Settings>): void {
    const next: Settings = {
      ...this.#settings,
      ...(patch.density !== undefined ? { density: patch.density } : {}),
      ...(patch.agentConfirmWrites !== undefined ? { agentConfirmWrites: patch.agentConfirmWrites } : {}),
    };
    if (next.density === this.#settings.density && next.agentConfirmWrites === this.#settings.agentConfirmWrites) return;
    this.#settings = next;
    this.#storage.set(SettingsModel.#KEY, JSON.stringify(next));
    this.#changed.fire();
  }

  /** 무엇이 바뀌었는지는 주지 않는다 — 받는 쪽이 `settings`를 다시 읽는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  static #restore(storage: IStorage): Settings {
    const raw = storage.get(SettingsModel.#KEY);
    if (raw === null) return DEFAULTS;
    try {
      const parsed = JSON.parse(raw) as { density?: unknown; agentConfirmWrites?: unknown };
      return {
        density: isDensity(parsed.density) ? parsed.density : DEFAULTS.density,
        agentConfirmWrites: typeof parsed.agentConfirmWrites === 'boolean' ? parsed.agentConfirmWrites : DEFAULTS.agentConfirmWrites,
      };
    } catch {
      return DEFAULTS;
    }
  }
}
