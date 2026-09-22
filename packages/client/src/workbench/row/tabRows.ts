import type { ComponentType, ReactNode } from "react";

export type PaneId = string;

export type SplitOrientation = "horizontal" | "vertical";

export type SplitEdge = "left" | "right" | "top" | "bottom";

export interface TabContentProps {
  readonly tabId: string;
}

export interface TabContextTarget {
  readonly paneId: PaneId;
  readonly tabId: string;
}

export interface TabRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly icon: ReactNode;
  readonly Content: ComponentType<TabContentProps>;
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

export interface PaneRowSplit {
  readonly kind: "split";
  readonly id: PaneId;
  readonly orientation: SplitOrientation;
  readonly children: readonly PaneRowNode[];
  readonly size?: number;
}

export type PaneRowNode = PaneRowLeaf | PaneRowSplit;
