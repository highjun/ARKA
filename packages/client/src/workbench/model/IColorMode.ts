import type { Disposable } from "#core/di";

/** 밝기 둘. `Shell`이 Primer `ThemeProvider`의 `colorMode`로 넘겨 토큰을 갈아 끼운다. */
export type Mode = "light" | "dark";

declare module "#core/di" {
  /** `IColorMode`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.colorMode": IColorMode;
  }
}
/** 밝기 모드. 테마 레지스트리는 없다 — light·dark 둘뿐이고 헤더의 ModeToggle이 바꾼다. */
export interface IColorMode {
  readonly mode: Mode;
  setMode(mode: Mode): void;
  onDidChange(listener: () => void): Disposable;
}
