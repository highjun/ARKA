import { ViewModelBase } from '#core/viewmodel';
import { atom } from 'nanostores';
import type { Density, ISettingsModel } from '../model/ISettingsModel';
import type { IThemeModel, Theme } from '../model/IThemeModel';
import type { ISettingsViewModel } from './ISettingsViewModel';

/** `ISettingsViewModel`의 유일한 구현체. */
export class SettingsViewModel extends ViewModelBase implements ISettingsViewModel {
  readonly #themeModel: IThemeModel;
  readonly #settingsModel: ISettingsModel;
  readonly #theme;
  readonly #density;

  constructor({ themeModel, settingsModel }: { themeModel: IThemeModel; settingsModel: ISettingsModel }) {
    super();
    this.#themeModel = themeModel;
    this.#settingsModel = settingsModel;
    this.#theme = this.observe(atom<Theme>(themeModel.theme));
    this.#density = this.observe(atom<Density>(settingsModel.settings.density));
    themeModel.onDidChange(() => this.#theme.set(themeModel.theme));
    settingsModel.onDidChange(() => this.#density.set(settingsModel.settings.density));
  }

  get theme(): Theme {
    return this.#theme.get();
  }

  get density(): Density {
    return this.#density.get();
  }

  setTheme(theme: Theme): void {
    this.#themeModel.setTheme(theme);
  }

  setDensity(density: Density): void {
    this.#settingsModel.update({ density });
  }
}
