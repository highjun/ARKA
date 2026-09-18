import type { Density } from "../model/ISettingsModel";

declare module "#core/di" {
  /** `ISettingsViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.settingsViewModel": ISettingsViewModel;
  }
}
/** 설정 탭의 화면 상태 — 테마와 밀도. VSCode 설정 편집기의 가장 작은 판. */
export interface ISettingsViewModel {
  readonly theme: "light" | "dark";
  readonly density: Density;
  setTheme(theme: "light" | "dark"): void;
  setDensity(density: Density): void;
}
