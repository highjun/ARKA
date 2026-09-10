import { createToken, type Disposable } from '#core/di';

/**
 * 화면 밀도. IDE 밀도(행 22~28px)와 터치 타겟(44px)이 충돌한다 — 컴포넌트는 변수만 참조하고 셸이 밀도를
 * 정한다. `auto`는 포인터 종류(coarse면 touch)로 정한다.
 */
export type Density = 'auto' | 'compact' | 'touch';

/** 저장소(localStorage)에 그대로 직렬화된다 — 함수나 클래스를 담지 않는다. */
export type Settings = {
  readonly density: Density;
  /** 에이전트가 파일을 바꾸는 툴을 부르기 전에 묻는다. 기본은 묻는다. */
  readonly agentConfirmWrites: boolean;
};

export const SettingsModelToken = createToken<ISettingsModel>('settingsModel');
/**
 * 사용자 설정. VSCode의 `IConfigurationService`에 해당하는 가장 작은 판 — 키가 늘면 여기 늘어난다.
 * `IStorage`로 스스로 지속한다. 테마는 `IThemeModel`이 이미 따로 갖는다.
 */
export interface ISettingsModel {
  readonly settings: Settings;
  update(patch: Partial<Settings>): void;
  onDidChange(listener: () => void): Disposable;
}
