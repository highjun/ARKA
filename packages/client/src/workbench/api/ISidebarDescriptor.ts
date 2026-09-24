import type { Descriptor, Registry } from "#core/registry";
import type { IconId } from "#ui/Icon";
import type { ComponentType } from "react";

export interface SidebarDescriptor extends Descriptor {
  readonly title: string;
  readonly iconId: IconId;
  readonly Content: ComponentType;
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.sidebar": Registry<SidebarDescriptor>;
  }
}
