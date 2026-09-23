import type { Disposable } from "#core/di";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.appStatusViewModel": IAppStatusViewModel;
  }
}
export interface IAppStatusViewModel extends Disposable {
  readonly workspaceName: string;
  readonly builtAt: string;
  readonly gitSha: string;
  readonly isOutdated: boolean;
  reload(): void;
}
