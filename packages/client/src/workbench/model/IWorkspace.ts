import type { URI } from "#contracts";
import type { Disposable } from "#core/di";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.workspace": IWorkspace;
  }
}
export interface IWorkspace {
  readonly root: URI;
  readonly name: string;
  resolve(relativePath: string): URI;
  relativize(uri: URI): string | null;
  load(): Promise<void>;
  onDidChange(listener: () => void): Disposable;
}
