import type { URI } from "#contracts";
import type { Container, Disposable } from "#core/di";
import type { OpenTab } from "./ITabLayout";
import type { OpenOptions, TabDescriptor } from "../api/ITabProviderDescriptor";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.tabs": ITabSystem;
  }
}
export interface ITabSystem {
  open(uri: URI, options?: OpenOptions): Promise<void>;
  restore(tabs: readonly OpenTab[]): Promise<void>;
  containerOf(tabId: string): Container;
  descriptorOf(tabId: string): TabDescriptor | undefined;
  hasAnyDirty(): boolean;
  onDidChange(listener: () => void): Disposable;
}
