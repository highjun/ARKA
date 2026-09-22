import type { Container, Disposable } from "#core/di";
import type { PaneId, PaneRowNode, SplitEdge } from "../row/tabRows";

export type { PaneRowLeaf, PaneRowNode, PaneRowSplit, SplitEdge, TabContextTarget, TabRow } from "../row/tabRows";

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.tabSystemViewModel": ITabSystemViewModel;
  }
}
export interface ITabSystemViewModel extends Disposable {
  readonly tree: PaneRowNode;
  readonly activePaneId: PaneId;
  readonly activeTab: { readonly id: string; readonly kind: string } | null;

  selectTab(paneId: PaneId, tabId: string): void;
  closeTab(paneId: PaneId, tabId: string): void;
  requestCloseTab(paneId: PaneId, tabId: string): void;
  readonly pendingClose: { readonly paneId: PaneId; readonly tabId: string } | null;
  confirmClose(): void;
  cancelClose(): void;
  closeOthers(paneId: PaneId, tabId: string): void;
  closeToRight(paneId: PaneId, tabId: string): void;

  reorderTabs(paneId: PaneId, nextTabIds: readonly string[]): void;
  splitTab(paneId: PaneId, tabId: string, edge: SplitEdge): void;
  resizePane(branchId: PaneId, childId: PaneId, nextSize: number): void;

  pinTab(tabId: string): void;
  retargetTabs(oldPrefix: string, newPrefix: string): void;

  containerOf(tabId: string): Container;
}
