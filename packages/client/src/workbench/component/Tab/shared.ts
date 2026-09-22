export type { PaneRowLeaf, PaneRowNode, PaneRowSplit, SplitEdge, TabRow } from "../../row/tabRows";
export type { SplitOrientation as TabSplitOrientation } from "../../row/tabRows";

export type TabChrome = "bordered" | "none";

export type TabId = string;

export type StripDropPosition = "before" | "after";
export type SplitDropPosition = "left" | "right" | "top" | "bottom" | "center";
export type TabDropZone = "strip" | "panel";

export interface TabClassNames {
  readonly header?: string;
  readonly headerLabel?: string;
  readonly headerIcon?: string;
  readonly headerActionSlot?: string;
  readonly headerCloseButtonPinned?: string;
  readonly headerCloseButtonHover?: string;
  readonly headerContextMenuTrigger?: string;
  readonly stripRoot?: string;
  readonly stripListContainer?: string;
  readonly stripList?: string;
  readonly stripItemWrapper?: string;
  readonly stripIndicatorBefore?: string;
  readonly stripIndicatorAfter?: string;
  readonly stripDraggableHeader?: string;
  readonly stripDropOverlay?: string;
  readonly stripScrollHandle?: string;
  readonly group?: string;
  readonly groupStrip?: string;
  readonly groupPanelWrapper?: string;
  readonly groupPanel?: string;
  readonly groupPanelContent?: string;
  readonly groupPanelEmpty?: string;
  readonly panelDropIndicator?: string;
  readonly splitRootHorizontal?: string;
  readonly splitRootVertical?: string;
  readonly splitBranchHorizontal?: string;
  readonly splitBranchVertical?: string;
  readonly splitBranchDividerHorizontal?: string;
  readonly splitBranchDividerVertical?: string;
  readonly leafSection?: string;
  readonly leafSectionActive?: string;
  readonly leafGroup?: string;
  readonly rootLeafSection?: string;
  readonly rootLeafGroup?: string;
  readonly resizeHandle?: string;
}
