import { createToken, type Disposable } from "#core/di";

/** 화면 밝기. `Shell`이 Primer `ThemeProvider`의 `colorMode`로 넘겨 토큰을 갈아 끼운다. */
export type Theme = "light" | "dark";

export const ThemeModelToken = createToken<IThemeModel>("themeModel");
/**
 * 지금 밝기, 그 값 하나만 갖는다. 다음 방문에도 유지되도록 `IStorage`로 스스로 지속한다.
 */
export interface IThemeModel {
  readonly theme: Theme;
  setTheme(theme: Theme): void;

  /** 상태가 바뀔 때마다 부른다. */
  onDidChange(listener: () => void): Disposable;
}
