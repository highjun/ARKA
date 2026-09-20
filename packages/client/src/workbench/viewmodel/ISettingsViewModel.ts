import type { Disposable } from "#core/di";

export interface SettingsRow {
  readonly id: string;
  readonly title: string;
  /** 어느 범주의 줄인가. 스키마에 없으면 「일반」이다. */
  readonly category: string;
  /** 제목 아래 한 줄. 없으면 안 그린다. */
  readonly description?: string;
  readonly type: "boolean" | "number" | "string" | "enum";
  readonly value: unknown;
  readonly options?: readonly string[];
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.settingsViewModel": ISettingsViewModel;
  }
}
export interface ISettingsViewModel extends Disposable {
  readonly rows: readonly SettingsRow[];
  /**
   * 찾을 말. **화면에 하나뿐이다** — 단축키도 한 범주라 제 검색창을 따로 두지 않는다.
   * 거르는 일은 화면이 한다(순수 변환이라 상태가 아니다).
   */
  readonly query: string;
  setQuery(value: string): void;
  set(id: string, value: unknown): void;
}
