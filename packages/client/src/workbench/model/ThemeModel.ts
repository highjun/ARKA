import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { IStorage } from '../model/IStorage';
import type { Theme, IThemeModel } from './IThemeModel';

/** `IThemeModel`의 유일한 구현체 — 생성자에서 `IStorage`로부터 저장된 테마를 복원한다. */
export class ThemeModel implements IThemeModel {
  static readonly #THEME_KEY = 'workbench.theme';

  readonly #storage: IStorage;
  #theme: Theme;

  constructor({ storage }: { storage: IStorage }) {
    this.#storage = storage;
    this.#theme = ThemeModel.#restoreTheme(storage);
  }

  /** `#theme`를 그대로 노출한다. */
  get theme() {
    return this.#theme;
  }

  /** `#theme`에 반영하고 `IStorage`에 지속한다. */
  setTheme(theme: Theme): void {
    this.#setTheme(theme);
    this.#storage.set(ThemeModel.#THEME_KEY, theme);
  }

  static #isTheme(value: string): value is Theme {
    return value === 'light' || value === 'dark';
  }

  static #restoreTheme(storage: IStorage): Theme {
    const raw = storage.get(ThemeModel.#THEME_KEY);
    return raw !== null && ThemeModel.#isTheme(raw) ? raw : 'light';
  }

  readonly #changed = new Emitter();

  #setTheme(next: Theme): void {
    if (this.#theme === next) return;
    this.#theme = next;
    this.#changed.fire();
  }

  /** 상태가 바뀔 때마다 부른다. ViewModel이 이걸 받아 자기 atom을 갱신한다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

}
