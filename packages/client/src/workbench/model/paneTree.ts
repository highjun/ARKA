import type { OpenTab, PaneId, PaneLeaf, PaneNode } from "./ITabLayout";
import { ROOT_PANE_ID } from "./tabsShare";

/** 트리 어디든 재귀로 내려가 `leafId`인 잎을 찾는다. 없으면 `null`. */
export const findLeaf = (node: PaneNode, leafId: PaneId): PaneLeaf | null => {
  if (node.kind === "leaf") return node.id === leafId ? node : null;
  for (const child of node.children) {
    const found = findLeaf(child, leafId);
    if (found !== null) return found;
  }
  return null;
};

/** `leafId`인 잎을 `replace`의 결과로 바꾼 새 트리. 잎을 split로 바꿀 수도 있다(분할). */
export const replaceLeaf = (node: PaneNode, leafId: PaneId, replace: (leaf: PaneLeaf) => PaneNode): PaneNode => {
  if (node.kind === "leaf") return node.id === leafId ? replace(node) : node;
  return { ...node, children: node.children.map((child) => replaceLeaf(child, leafId, replace)) };
};

/** 빈 잎을 걷어내고, 자식이 하나만 남은 split은 그 자식으로 대체한다. 전부 사라지면 `null`. */
export const pruneTree = (node: PaneNode): PaneNode | null => {
  if (node.kind === "leaf") return node.tabs.length > 0 ? node : null;
  const survivors = node.children.map(pruneTree).filter((child): child is PaneNode => child !== null);
  const [only, second] = survivors;
  if (only === undefined) return null;
  return second !== undefined ? { ...node, children: survivors } : { ...only, size: node.size };
};

/** 그리는 순서로 첫 잎. 빈 split(있을 수 없지만)이면 루트 id. */
export const firstLeafId = (node: PaneNode): PaneId => {
  if (node.kind === "leaf") return node.id;
  const [first] = node.children;
  return first === undefined ? ROOT_PANE_ID : firstLeafId(first);
};

/** `tabId`를 담고 있는 잎. 없으면 `null`. */
export const leafOfTab = (node: PaneNode, tabId: string): PaneLeaf | null => {
  if (node.kind === "leaf") return node.tabs.some((tab) => tab.id === tabId) ? node : null;
  for (const child of node.children) {
    const found = leafOfTab(child, tabId);
    if (found !== null) return found;
  }
  return null;
};

/**
 * `ids`의 탭을 어느 잎에서든 뺀 새 트리. 활성 탭이 빠지면 `neighbourOf`로 옮긴다.
 * 빈 잎은 남긴다 — 걷어내는 것은 `pruneTree`의 몫이다.
 */
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

/** 트리의 탭 전부, 그리는 순서로. */
export const collectTabs = (node: PaneNode): readonly OpenTab[] =>
  node.kind === "leaf" ? node.tabs : node.children.flatMap(collectTabs);

/**
 * 탭을 닫을 때 어느 이웃을 활성화할 것인가 — **오른쪽 먼저, 없으면 왼쪽**이다.
 * 사람이 탭을 연달아 닫을 때 손이 한 자리에 머문다. `tabs`는 이미 닫은 것을 뺀 목록이다.
 */
export const neighbourOf = (tabs: readonly OpenTab[], closedIndex: number): string | null =>
  tabs[closedIndex]?.id ?? tabs[closedIndex - 1]?.id ?? null;
