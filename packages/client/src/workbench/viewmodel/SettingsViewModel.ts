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
  readonly #agentConfirmWrites;

  /** 두 Model을 구독해 atom으로 옮긴다 — View는 Model을 직접 보지 않는다. */
  constructor({ themeModel, settingsModel }: { themeModel: IThemeModel; settingsModel: ISettingsModel }) {
    super();
    this.#themeModel = themeModel;
    this.#settingsModel = settingsModel;
    this.#theme = this.observe(atom<Theme>(themeModel.theme));
    this.#density = this.observe(atom<Density>(settingsModel.settings.density));
    this.#agentConfirmWrites = this.observe(atom(settingsModel.settings.agentConfirmWrites));
    themeModel.onDidChange(() => this.#theme.set(themeModel.theme));
    settingsModel.onDidChange(() => {
      this.#density.set(settingsModel.settings.density);
      this.#agentConfirmWrites.set(settingsModel.settings.agentConfirmWrites);
    });
  }

  /** 저장된 값이 이미 복원된 뒤다 — 부팅 직후에도 실제 테마가 온다. */
  get theme(): Theme {
    return this.#theme.get();
  }

  /** `auto`가 그대로 온다 — 포인터 종류로 푸는 것은 CSS의 몫이다. */
  get density(): Density {
    return this.#density.get();
  }

  /** Model에 넘길 뿐이다 — 저장과 알림은 그쪽이 한다. */
  setTheme(theme: Theme): void {
    this.#themeModel.setTheme(theme);
  }

  /** Model에 넘길 뿐이다 — 저장과 알림은 그쪽이 한다. */
  setDensity(density: Density): void {
    this.#settingsModel.update({ density });
  }

  /** 에이전트가 파일을 바꾸기 전에 묻는지. 기본은 묻는다. */
  get agentConfirmWrites(): boolean {
    return this.#agentConfirmWrites.get();
  }

  /** Model에 넘길 뿐이다 — 저장과 알림은 그쪽이 한다. */
  setAgentConfirmWrites(value: boolean): void {
    this.#settingsModel.update({ agentConfirmWrites: value });
  }
}
