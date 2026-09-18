import { ViewModelBase } from "#core/viewmodel";
import { atom } from "nanostores";
import type { Density, ISettingsModel } from "../model/ISettingsModel";
import type { IColorMode, Mode } from "../model/IColorMode";
import type { ISettingsViewModel } from "./ISettingsViewModel";

/** `ISettingsViewModel`의 유일한 구현체. */
export class SettingsViewModel extends ViewModelBase implements ISettingsViewModel {
  readonly #colorMode: IColorMode;
  readonly #settingsModel: ISettingsModel;
  readonly #theme;
  readonly #density;

  /** 두 Model을 구독해 atom으로 옮긴다 — View는 Model을 직접 보지 않는다. */
  constructor({ colorMode, settingsModel }: { colorMode: IColorMode; settingsModel: ISettingsModel }) {
    super();
    this.#colorMode = colorMode;
    this.#settingsModel = settingsModel;
    this.#theme = this.observe(atom<Mode>(colorMode.mode));
    this.#density = this.observe(atom<Density>(settingsModel.settings.density));
    colorMode.onDidChange(() => this.#theme.set(colorMode.mode));
    settingsModel.onDidChange(() => this.#density.set(settingsModel.settings.density));
  }

  /** 저장된 값이 이미 복원된 뒤다 — 부팅 직후에도 실제 테마가 온다. */
  get theme(): Mode {
    return this.#theme.get();
  }

  /** `auto`가 그대로 온다 — 포인터 종류로 푸는 것은 CSS의 몫이다. */
  get density(): Density {
    return this.#density.get();
  }

  /** Model에 넘길 뿐이다 — 저장과 알림은 그쪽이 한다. */
  setTheme(theme: Mode): void {
    this.#colorMode.setMode(theme);
  }

  /** Model에 넘길 뿐이다 — 저장과 알림은 그쪽이 한다. */
  setDensity(density: Density): void {
    this.#settingsModel.update({ density });
  }
}
