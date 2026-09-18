import type { Disposable } from "#core/di";

/** 설정 화면의 한 줄. 스키마와 지금 값을 함께 든다. */
export interface SettingsRow {
  readonly id: string;
  readonly title: string;
  readonly type: "boolean" | "number" | "string" | "enum";
  readonly value: unknown;
  readonly options?: readonly string[];
}

declare module "#core/di" {
  /** `ISettingsViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.settingsViewModel": ISettingsViewModel;
  }
}
/** 설정 화면. 등록된 스키마를 줄로 펴고 값을 물린다. */
export interface ISettingsViewModel extends Disposable {
  readonly rows: readonly SettingsRow[];
  set(id: string, value: unknown): void;
}
