import type { Disposable } from "#core/di";
import type { IconId } from "#component/Icon";
import type { BottomDescriptor } from "../model/IBottomDescriptor";
import type { SidebarDescriptor } from "../model/ISidebarDescriptor";

export interface SidebarRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
  readonly Content: SidebarDescriptor["Content"];
}

export interface BottomRow {
  readonly id: string;
  readonly title: string;
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
  toggleSidebar(id: string): void;
  revealSidebar(id: string): void;
  toggleSidebarExpanded(): void;
  readonly bottoms: readonly BottomRow[];
  readonly activeBottom: ActiveBottom | null;
  toggleBottom(id: string): void;
  toggleBottomOpen(): void;
  readonly isNarrow: boolean;

  readonly colorMode: "light" | "dark";
  toggleColorMode(): void;

  readonly isSidebarOpen: boolean;
  setSidebarOpen(open: boolean): void;
}
