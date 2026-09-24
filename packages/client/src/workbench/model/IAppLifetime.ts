import type { Disposable } from "#core/di";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.appLifetime": IAppLifetime;
  }
}
export interface IAppLifetime {
  /** 프로토콜 버전이나 헤더가 서버와 다르다 — 지금 화면으로는 말이 안 통한다. */
  readonly isOutdated: boolean;
  /** 처음 본 서버 gitSha와 지금 것이 다르다 — 새 배포가 올라왔다. `load()`를 다시 부를 때 갱신된다. */
  readonly isUpdateAvailable: boolean;
  readonly builtAt: string;
  readonly gitSha: string;
  load(): Promise<void>;
  requestReload(reason: "versionMismatch" | "userRequested"): void;
  onDidChange(listener: () => void): Disposable;
}
