import type { Disposable } from "#core/di";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.appLifetime": IAppLifetime;
  }
}
export interface IAppLifetime {
  readonly isOutdated: boolean;
  readonly buildId: string;
  load(): Promise<void>;
  requestReload(reason: "versionMismatch" | "userRequested"): void;
  onDidChange(listener: () => void): Disposable;
}
