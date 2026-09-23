import type { Disposable } from "#core/di";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.appLifetime": IAppLifetime;
  }
}
export interface IAppLifetime {
  readonly isOutdated: boolean;
  readonly builtAt: string;
  readonly gitSha: string;
  load(): Promise<void>;
  requestReload(reason: "versionMismatch" | "userRequested"): void;
  onDidChange(listener: () => void): Disposable;
}
