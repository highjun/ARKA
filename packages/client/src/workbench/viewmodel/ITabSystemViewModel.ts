import type { Container, Disposable } from "#core/di";
import type { PaneId, SplitOrientation } from "../model/ITabLayout";
import type { TabDescriptor } from "../api/ITabProviderDescriptor";

export type SplitEdge = "left" | "right" | "top" | "bottom";

export interface TabContextTarget {
  readonly paneId: PaneId;
  readonly tabId: string;
}

export interface TabRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly icon: TabDescriptor["icon"];
  readonly Content: TabDescriptor["Content"];
  readonly isPreview: boolean;
  readonly isDirty: boolean;
}

export interface PaneRowLeaf {
  readonly kind: "leaf";
  readonly id: PaneId;
  readonly tabs: readonly TabRow[];
  readonly activeTabId: string | null;
  readonly size?: number;
}

interface PaneRowSplit {
  readonly kind: "split";
  readonly id: PaneId;
  readonly orientation: SplitOrientation;
  readonly children: readonly PaneRowNode[];
  readonly size?: number;
}

export type PaneRowNode = PaneRowLeaf | PaneRowSplit;

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

  /** 탭을 `targetPaneId` 칸의 `beforeTabId` 앞으로 옮긴다 — 맨 뒤면 `null`. 같은 칸이면 순서 바꾸기다. */
  moveTab(targetPaneId: PaneId, tabId: string, beforeTabId: string | null): void;
  splitTab(paneId: PaneId, tabId: string, edge: SplitEdge): void;
  resizePane(branchId: PaneId, childId: PaneId, nextSize: number): void;

  pinTab(tabId: string): void;
  retargetTabs(oldPrefix: string, newPrefix: string): void;

  containerOf(tabId: string): Container;
}
