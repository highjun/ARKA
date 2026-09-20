import type { Disposable } from "#core/di";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.viewport": IViewport;
  }
}
export interface IViewport {
  readonly isNarrow: boolean;
  onDidChange(listener: () => void): Disposable;
}
