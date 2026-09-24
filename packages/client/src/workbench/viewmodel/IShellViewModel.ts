import type { Disposable } from "#core/di";
import type { BottomDescriptor } from "../api/IBottomDescriptor";
import type { BottomRow, SidebarRow } from "../row/shellRows";

export type { BottomRow, SidebarRow } from "../row/shellRows";

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
