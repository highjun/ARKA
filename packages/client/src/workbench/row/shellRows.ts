import type { IconId } from "#ui/Icon";
import type { ComponentType } from "react";

export interface SidebarRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
  readonly Content: ComponentType;
}

export interface BottomRow {
  readonly id: string;
  readonly title: string;
}
