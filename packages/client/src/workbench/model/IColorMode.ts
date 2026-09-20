import type { Disposable } from "#core/di";

export type Mode = "light" | "dark";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.colorMode": IColorMode;
  }
}
export interface IColorMode {
  readonly mode: Mode;
  setMode(mode: Mode): void;
  onDidChange(listener: () => void): Disposable;
}
