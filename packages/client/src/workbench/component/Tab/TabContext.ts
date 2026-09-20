import { createContext, useContext } from "react";
import styles from "./Tab.module.css";
import type { TabClassNames } from "./shared";

export const ClassNamesContext = createContext<TabClassNames>({});

export const useTabClassNames = () => useContext(ClassNamesContext);

export const buildClassNames = (): TabClassNames => {
  return {
    header: styles["header"],
    headerLabel: styles["headerLabel"],
    headerActionSlot: styles["headerActionSlot"],
    headerCloseButtonHover: styles["headerCloseButtonHover"],
    headerIcon: styles["headerIcon"],
    headerCloseButtonPinned: styles["headerCloseButtonPinned"],
    headerContextMenuTrigger: styles["headerContextMenuTrigger"],

    stripRoot: styles["stripRoot"],
    stripListContainer: styles["stripListContainer"],
    stripList: styles["stripList"],
    stripItemWrapper: styles["stripItemWrapper"],
    stripIndicatorBefore: styles["stripIndicatorBefore"],
    stripIndicatorAfter: styles["stripIndicatorAfter"],
    stripDraggableHeader: styles["stripDraggableHeader"],
    stripDropOverlay: styles["stripDropOverlay"],
    stripScrollHandle: styles["stripScrollHandle"],

    group: styles["group"],
    groupStrip: styles["groupStrip"],
    groupPanelWrapper: styles["groupPanelWrapper"],
    groupPanel: styles["groupPanel"],
    groupPanelContent: styles["groupPanelContent"],
    groupPanelEmpty: styles["groupPanelEmpty"],
    panelDropIndicator: styles["panelDropIndicator"],

    splitRootHorizontal: styles["splitRootHorizontal"],
    splitRootVertical: styles["splitRootVertical"],
    splitBranchHorizontal: styles["splitBranchHorizontal"],
    splitBranchVertical: styles["splitBranchVertical"],
    splitBranchDividerHorizontal: styles["splitBranchDividerHorizontal"],
    splitBranchDividerVertical: styles["splitBranchDividerVertical"],
    leafSection: styles["leafSection"],
    leafSectionActive: styles["leafSectionActive"],
    leafGroup: styles["leafGroup"],
    rootLeafSection: styles["rootLeafSection"],
    rootLeafGroup: styles["rootLeafGroup"],
    resizeHandle: styles["resizeHandle"],
  };
};
