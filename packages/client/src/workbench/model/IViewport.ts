import type { Disposable } from "#core/di";

declare module "#core/di" {
  /** `IViewport`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.viewport": IViewport;
  }
}
/**
 * 화면이 좁은가. 사이드바·아래 창이 겹쳐 뜨고 탭이 하나만 보이는 경계다 — 값은 플랫폼(`matchMedia`)이
 * 주고 Model·ViewModel은 이 계약만 본다.
 */
export interface IViewport {
  readonly isNarrow: boolean;
  onDidChange(listener: () => void): Disposable;
}
