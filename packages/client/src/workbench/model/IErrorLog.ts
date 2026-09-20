import type { Disposable } from "#core/di";

export type ErrorEntry = {
  readonly time: number;
  readonly source: string;
  readonly name: string;
  readonly message: string;
  readonly stack: string | undefined;
};

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.errorLog": IErrorLog;
  }
}
export interface IErrorLog {
  readonly entries: readonly ErrorEntry[];
  report(error: unknown, source: string): void;
  onDidChange(listener: () => void): Disposable;
}
