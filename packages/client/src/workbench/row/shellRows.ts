import type { IconId } from "#component/Icon";

export interface SidebarRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
}

export interface SidebarActionRow {
  readonly actionId: string;
  readonly iconId: IconId;
  readonly label: string;
}

export interface BottomRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
  readonly isActive: boolean;
}
