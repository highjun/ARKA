import type { OpenTab, PaneId, PaneLeaf, PaneNode } from "./ITabLayout";
import { ROOT_PANE_ID } from "./tabsShare";

export const findLeaf = (node: PaneNode, leafId: PaneId): PaneLeaf | null => {
  if (node.kind === "leaf") return node.id === leafId ? node : null;
  for (const child of node.children) {
    const found = findLeaf(child, leafId);
    if (found !== null) return found;
  }
  return null;
};

export const replaceLeaf = (node: PaneNode, leafId: PaneId, replace: (leaf: PaneLeaf) => PaneNode): PaneNode => {
  if (node.kind === "leaf") return node.id === leafId ? replace(node) : node;
  return { ...node, children: node.children.map((child) => replaceLeaf(child, leafId, replace)) };
};

export const pruneTree = (node: PaneNode): PaneNode | null => {
  if (node.kind === "leaf") return node.tabs.length > 0 ? node : null;
  const survivors = node.children.map(pruneTree).filter((child): child is PaneNode => child !== null);
  const [only, second] = survivors;
  if (only === undefined) return null;
  return second !== undefined ? { ...node, children: survivors } : { ...only, size: node.size };
};

export const firstLeafId = (node: PaneNode): PaneId => {
  if (node.kind === "leaf") return node.id;
  const [first] = node.children;
  return first === undefined ? ROOT_PANE_ID : firstLeafId(first);
};

export const leafOfTab = (node: PaneNode, tabId: string): PaneLeaf | null => {
  if (node.kind === "leaf") return node.tabs.some((tab) => tab.id === tabId) ? node : null;
  for (const child of node.children) {
    const found = leafOfTab(child, tabId);
    if (found !== null) return found;
  }
  return null;
};

export const withoutTabs = (node: PaneNode, ids: ReadonlySet<string>): PaneNode => {
  if (node.kind === "split") return { ...node, children: node.children.map((child) => withoutTabs(child, ids)) };
  const index = node.tabs.findIndex((tab) => tab.id === node.activeTabId);
  const tabs = node.tabs.filter((tab) => !ids.has(tab.id));
  if (tabs.length === node.tabs.length) return node;
  const activeTabId =
    node.activeTabId !== null && ids.has(node.activeTabId)
      ? neighbourOf(tabs, Math.min(index, tabs.length))
      : node.activeTabId;
  return { ...node, tabs, activeTabId };
};

export const collectTabs = (node: PaneNode): readonly OpenTab[] =>
  node.kind === "leaf" ? node.tabs : node.children.flatMap(collectTabs);

export const neighbourOf = (tabs: readonly OpenTab[], closedIndex: number): string | null =>
  tabs[closedIndex]?.id ?? tabs[closedIndex - 1]?.id ?? null;
