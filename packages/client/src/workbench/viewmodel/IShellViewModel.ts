import type { Disposable } from "#core/di";
import type { BottomDescriptor } from "../model/IBottomDescriptor";
import type { SidebarDescriptor } from "../model/ISidebarDescriptor";
import type { BottomRow, SidebarActionRow, SidebarRow } from "../row/shellRows";

export type { BottomRow, SidebarActionRow, SidebarRow } from "../row/shellRows";

export interface ActiveSidebar {
  readonly id: string;
  readonly title: string;
  readonly Content: SidebarDescriptor["Content"];
  readonly actions: readonly SidebarActionRow[];
}

export interface ActiveBottom {
  readonly id: string;
  readonly Content: BottomDescriptor["Content"];
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.shellViewModel": IShellViewModel;
  }
}
export interface IShellViewModel extends Disposable {
  readonly sidebars: readonly SidebarRow[];
  readonly activeSidebarId: string | null;
  readonly activeSidebar: ActiveSidebar | null;
  toggleSidebar(id: string): void;
  revealSidebar(id: string): void;
  readonly bottoms: readonly BottomRow[];
  readonly activeBottom: ActiveBottom | null;
  toggleBottom(id: string): void;
  readonly isNarrow: boolean;

  readonly colorMode: "light" | "dark";
  toggleColorMode(): void;

  readonly isSidebarOpen: boolean;
  setSidebarOpen(open: boolean): void;
}
