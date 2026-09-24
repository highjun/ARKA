import type { URI } from "#contracts";
import type { Descriptor, Registry } from "#core/registry";
import type { ComponentType, ReactNode } from "react";

export interface TabContentProps {
  readonly tabId: string;
}

export interface TabDescriptor {
  readonly icon: ReactNode;
  readonly title: string;
  readonly isDirty: boolean;
  readonly Content: ComponentType<TabContentProps>;
}

export interface TabProviderDescriptor extends Descriptor {
  readonly priority: number;
  readonly openTab: (uri: URI) => Promise<TabDescriptor | undefined>;
}

export interface OpenOptions {
  readonly preview?: boolean;
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.tabSystem": Registry<TabProviderDescriptor>;
  }
}
