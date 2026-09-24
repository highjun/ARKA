import { URI } from "#contracts";
import type { ICommandService } from "#core/commands";
import type { Container, Disposable } from "#core/di";
import { makeAutoObservable, observable, observableRef, reaction } from "mobx";
import type { ITabLayout, OpenTab, PaneId, PaneLeaf, PaneNode, SplitOrientation } from "../model/ITabLayout";
import type { ITabSystem } from "../model/ITabSystem";
import { collectTabs, findLeaf, firstLeafId, leafOfTab, neighbourOf, pruneTree, replaceLeaf } from "../model/paneTree";
import { ROOT_PANE_ID } from "../model/tabsShare";
import type { ITabSystemViewModel, PaneRowNode, SplitEdge, TabContextTarget, TabRow } from "./ITabSystemViewModel";

const EmptyContent = () => null;

export class TabSystemViewModel implements ITabSystemViewModel {
  static readonly #EMPTY_ROOT: PaneNode = { kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null };

  readonly #layout: ITabLayout;
  readonly #tabs: ITabSystem;
  readonly #copyToClipboard: (text: string) => void;
  readonly #subscriptions: Disposable[] = [];
  private layoutState: { readonly tree: PaneNode; readonly previewTabId: string | null };
  private activePaneIdState: PaneId;
  private pendingCloseState: { paneId: PaneId; tabId: string } | null = null;

  constructor({
    tabLayout,
    tabs,
    commands,
    copyToClipboard,
  }: {
    tabLayout: ITabLayout;
    tabs: ITabSystem;
    commands: ICommandService;
    copyToClipboard: (text: string) => void;
  }) {
    this.#layout = tabLayout;
    this.#tabs = tabs;
    this.#copyToClipboard = copyToClipboard;
    this.layoutState = this.#snapshotLayout();
    this.activePaneIdState = tabLayout.activePaneId;

    makeAutoObservable<this, "layoutState" | "activePaneIdState" | "pendingCloseState">(
      this,
      { layoutState: observableRef, activePaneIdState: observable, pendingCloseState: observableRef },
      { autoBind: true },
    );

    this.#subscriptions.push(
      tabLayout.onDidChange(() => this.recompute()),
      tabs.onDidChange(() => this.recompute()),
      {
        dispose: reaction(
          () => {
            const preview = this.layoutState.previewTabId;
            return preview !== null && this.#isDirty(preview) ? preview : null;
          },
          (dirtyPreview) => {
            if (dirtyPreview !== null) this.pinTab(dirtyPreview);
          },
        ),
      },
    );

    this.#registerCommands(commands);
  }

  get tree(): PaneRowNode {
    return this.#toRowTree(this.layoutState.tree, this.layoutState.previewTabId);
  }

  get activePaneId(): PaneId {
    return this.activePaneIdState;
  }

  get activeTab(): { readonly id: string; readonly kind: string } | null {
    const leaf = findLeaf(this.layoutState.tree, this.activePaneIdState);
    const active = leaf?.tabs.find((tab) => tab.id === leaf.activeTabId);
    return active === undefined ? null : { id: active.id, kind: active.kind };
  }

  selectTab(paneId: PaneId, tabId: string): void {
    const tree = this.#layout.tree;
    const leaf = findLeaf(tree, paneId);
    if (!leaf || !leaf.tabs.some((tab) => tab.id === tabId)) return;

    const nextTree = replaceLeaf(tree, paneId, (l) => ({ ...l, activeTabId: tabId }));
    this.#commit(nextTree, paneId);
  }

  closeTab(paneId: PaneId, tabId: string): void {
    const tree = this.#layout.tree;
    const leaf = findLeaf(tree, paneId);
    if (!leaf) return;
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;

    const remaining = leaf.tabs.filter((tab) => tab.id !== tabId);
    const nextActiveTabId = leaf.activeTabId === tabId ? neighbourOf(remaining, index) : leaf.activeTabId;
    const nextTree = replaceLeaf(tree, paneId, (l) => ({ ...l, tabs: remaining, activeTabId: nextActiveTabId }));

    if (this.#layout.previewTabId === tabId) this.#layout.setPreviewTabId(null);
    this.#commit(nextTree, this.#layout.activePaneId);
  }

  get pendingClose(): { readonly paneId: PaneId; readonly tabId: string } | null {
    return this.pendingCloseState;
  }

  requestCloseTab(paneId: PaneId, tabId: string): void {
    if (!this.#isDirty(tabId)) {
      this.closeTab(paneId, tabId);
      return;
    }
    this.pendingCloseState = { paneId, tabId };
  }

  confirmClose(): void {
    const pending = this.pendingCloseState;
    this.pendingCloseState = null;
    if (pending === null) return;
    this.closeTab(pending.paneId, pending.tabId);
  }

  cancelClose(): void {
    this.pendingCloseState = null;
  }

  closeOthers(paneId: PaneId, tabId: string): void {
    const tree = this.#layout.tree;
    const leaf = findLeaf(tree, paneId);
    if (!leaf || !leaf.tabs.some((tab) => tab.id === tabId)) return;

    const kept = leaf.tabs.filter((tab) => tab.id === tabId || this.#isDirty(tab.id));
    if (kept.length === leaf.tabs.length) return;
    this.#closeMany(paneId, leaf, kept, tabId);
  }

  closeToRight(paneId: PaneId, tabId: string): void {
    const tree = this.#layout.tree;
    const leaf = findLeaf(tree, paneId);
    if (!leaf) return;
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;

    const closable = new Set(
      leaf.tabs
        .slice(index + 1)
        .filter((tab) => !this.#isDirty(tab.id))
        .map((tab) => tab.id),
    );
    if (closable.size === 0) return;
    const kept = leaf.tabs.filter((tab) => !closable.has(tab.id));
    this.#closeMany(paneId, leaf, kept, tabId);
  }

  #closeMany(paneId: PaneId, leaf: PaneLeaf, kept: readonly OpenTab[], fallbackActiveTabId: string): void {
    const closedIds = new Set(leaf.tabs.filter((tab) => !kept.includes(tab)).map((tab) => tab.id));
    const nextActiveTabId =
      leaf.activeTabId !== null && closedIds.has(leaf.activeTabId) ? fallbackActiveTabId : leaf.activeTabId;
    const tree = this.#layout.tree;
    const nextTree = replaceLeaf(tree, paneId, (l) => ({ ...l, tabs: kept, activeTabId: nextActiveTabId }));

    const preview = this.#layout.previewTabId;
    if (preview !== null && closedIds.has(preview)) this.#layout.setPreviewTabId(null);
    this.#commit(nextTree, this.#layout.activePaneId);
  }

  /**
   * 탭을 `targetPaneId` 칸의 `beforeTabId` 앞으로 옮긴다 — 맨 뒤면 `null`.
   * 탭이 어느 칸에 있었는지는 여기서 찾는다. 같은 칸이면 그대로 순서 바꾸기다.
   */
  moveTab(targetPaneId: PaneId, tabId: string, beforeTabId: string | null): void {
    const tree = this.#layout.tree;
    const source = leafOfTab(tree, tabId);
    if (!source || !findLeaf(tree, targetPaneId)) return;
    const moved = source.tabs.find((tab) => tab.id === tabId);
    if (!moved) return;

    const detached = replaceLeaf(tree, source.id, (leaf) => {
      const remaining = leaf.tabs.filter((tab) => tab.id !== tabId);
      return {
        kind: "leaf",
        id: leaf.id,
        tabs: remaining,
        activeTabId: leaf.activeTabId === tabId ? (remaining[0]?.id ?? null) : leaf.activeTabId,
        size: leaf.size,
      };
    });

    const nextTree = replaceLeaf(detached, targetPaneId, (leaf) => {
      const at = beforeTabId === null ? -1 : leaf.tabs.findIndex((tab) => tab.id === beforeTabId);
      const index = at < 0 ? leaf.tabs.length : at;
      return {
        kind: "leaf",
        id: leaf.id,
        tabs: [...leaf.tabs.slice(0, index), moved, ...leaf.tabs.slice(index)],
        activeTabId: tabId,
        size: leaf.size,
      };
    });

    this.#commit(nextTree, targetPaneId);
  }

  /**
   * `targetLeafId` 칸을 쪼개고 그 자리에 `tabId` 를 옮긴다.
   * 탭이 어느 칸에 있었는지는 여기서 찾는다 — 그리는 쪽은 "어디에 놓았는지"만 안다.
   */
  splitTab(targetLeafId: PaneId, tabId: string, position: SplitEdge): void {
    const tree = this.#layout.tree;
    const sourceLeaf = leafOfTab(tree, tabId);
    if (!sourceLeaf || !findLeaf(tree, targetLeafId)) return;
    const movedTab = sourceLeaf.tabs.find((tab) => tab.id === tabId);
    if (!movedTab) return;
    // 혼자 있는 탭을 제 칸에 다시 놓는 것은 아무 일도 아니다.
    if (sourceLeaf.id === targetLeafId && sourceLeaf.tabs.length < 2) return;

    const withoutMoved = replaceLeaf(tree, sourceLeaf.id, (leaf) => {
      const remaining = leaf.tabs.filter((tab) => tab.id !== tabId);
      return {
        kind: "leaf",
        id: leaf.id,
        tabs: remaining,
        activeTabId: leaf.activeTabId === tabId ? (remaining[0]?.id ?? null) : leaf.activeTabId,
      };
    });

    const newLeafId = `${targetLeafId}-split-${tabId}`;
    const newLeaf: PaneLeaf = { kind: "leaf", id: newLeafId, tabs: [movedTab], activeTabId: tabId };
    const orientation: SplitOrientation = position === "left" || position === "right" ? "horizontal" : "vertical";

    const nextTree = replaceLeaf(withoutMoved, targetLeafId, (leaf) => ({
      kind: "split",
      id: `${targetLeafId}-split-root`,
      orientation,
      children: position === "left" || position === "top" ? [newLeaf, leaf] : [leaf, newLeaf],
    }));

    this.#commit(nextTree, newLeafId);
  }

  resizePane(branchId: PaneId, childId: PaneId, nextSize: number): void {
    const tree = this.#layout.tree;
    this.#layout.setTree(this.#resizeChild(tree, branchId, childId, nextSize));
  }

  retargetTabs(oldPrefix: string, newPrefix: string): void {
    const retargetPath = (path: string): string | null => {
      if (path === oldPrefix) return newPrefix;
      if (path.startsWith(`${oldPrefix}/`)) return `${newPrefix}${path.slice(oldPrefix.length)}`;
      return null;
    };

    const tree = this.#layout.tree;
    const moved = new Map<string, OpenTab>();
    for (const tab of collectTabs(tree)) {
      if (tab.uri.scheme !== "file") continue;
      const nextPath = retargetPath(tab.uri.path);
      if (nextPath === null) continue;
      const uri = URI.file(nextPath);
      moved.set(tab.id, { ...tab, id: uri.toString(), uri, title: this.#nameOf(nextPath) });
    }
    if (moved.size === 0) return;

    this.#layout.setTree(this.#retargetTree(tree, moved));
    const preview = this.#layout.previewTabId;
    const movedPreview = preview === null ? undefined : moved.get(preview);
    if (movedPreview !== undefined) this.#layout.setPreviewTabId(movedPreview.id);
    void this.#tabs.restore([...moved.values()]);
  }

  pinTab(tabId: string): void {
    if (this.#layout.previewTabId === tabId) this.#layout.setPreviewTabId(null);
  }

  containerOf(tabId: string): Container {
    return this.#tabs.containerOf(tabId);
  }

  dispose(): void {
    for (const subscription of this.#subscriptions) subscription.dispose();
  }

  private recompute(): void {
    this.layoutState = this.#snapshotLayout();
    this.activePaneIdState = this.#layout.activePaneId;
  }

  #snapshotLayout(): { readonly tree: PaneNode; readonly previewTabId: string | null } {
    return { tree: this.#layout.tree, previewTabId: this.#layout.previewTabId };
  }

  #isDirty(tabId: string): boolean {
    return this.#tabs.descriptorOf(tabId)?.isDirty ?? false;
  }

  #toRowTree(node: PaneNode, previewId: string | null): PaneRowNode {
    if (node.kind === "leaf") {
      return {
        kind: "leaf",
        id: node.id,
        tabs: node.tabs.map((tab): TabRow => {
          const descriptor = this.#tabs.descriptorOf(tab.id);
          return {
            id: tab.id,
            kind: tab.kind,
            title: descriptor?.title ?? tab.title,
            icon: descriptor?.icon ?? null,
            Content: descriptor?.Content ?? EmptyContent,
            isPreview: tab.id === previewId,
            isDirty: descriptor?.isDirty ?? false,
          };
        }),
        activeTabId: node.activeTabId,
        size: node.size,
      };
    }
    return {
      kind: "split",
      id: node.id,
      orientation: node.orientation,
      children: node.children.map((child) => this.#toRowTree(child, previewId)),
      size: node.size,
    };
  }

  #resizeChild(node: PaneNode, branchId: PaneId, childId: PaneId, nextSize: number): PaneNode {
    if (node.kind === "leaf") return node;
    if (node.id === branchId) {
      return {
        ...node,
        children: node.children.map((child) => (child.id === childId ? { ...child, size: nextSize } : child)),
      };
    }
    return { ...node, children: node.children.map((child) => this.#resizeChild(child, branchId, childId, nextSize)) };
  }

  #retargetTree(node: PaneNode, moved: ReadonlyMap<string, OpenTab>): PaneNode {
    if (node.kind === "leaf") {
      const tabs = node.tabs.map((tab) => moved.get(tab.id) ?? tab);
      const activeTabId = node.activeTabId === null ? null : (moved.get(node.activeTabId)?.id ?? node.activeTabId);
      const changed = activeTabId !== node.activeTabId || tabs.some((tab, index) => tab !== node.tabs[index]);
      return changed ? { ...node, tabs, activeTabId } : node;
    }
    const children = node.children.map((child) => this.#retargetTree(child, moved));
    return children.some((child, index) => child !== node.children[index]) ? { ...node, children } : node;
  }

  #commit(tree: PaneNode, preferredActiveLeafId: PaneId): void {
    const pruned = pruneTree(tree) ?? TabSystemViewModel.#EMPTY_ROOT;
    this.#layout.setTree(pruned);
    const activeLeafId = findLeaf(pruned, preferredActiveLeafId) ? preferredActiveLeafId : firstLeafId(pruned);
    this.#layout.setActivePaneId(activeLeafId);
  }

  #nameOf(path: string): string {
    return path.split("/").pop() ?? path;
  }

  #registerCommands(commands: ICommandService): void {
    const isTabContextTarget = (value: unknown): value is TabContextTarget =>
      typeof value === "object" && value !== null && "paneId" in value && "tabId" in value;

    const findActiveTabId = (node: PaneRowNode, paneId: PaneId): string | null => {
      if (node.kind === "leaf") return node.id === paneId ? node.activeTabId : null;
      for (const child of node.children) {
        const found = findActiveTabId(child, paneId);
        if (found !== null) return found;
      }
      return null;
    };

    const targetOf = (context: unknown): TabContextTarget | null => {
      if (isTabContextTarget(context)) return context;
      const paneId = this.activePaneId;
      const activeTabId = findActiveTabId(this.tree, paneId);
      return activeTabId === null ? null : { paneId, tabId: activeTabId };
    };

    const registerSplit = (id: string, label: string, position: SplitEdge): void => {
      commands.actions.add({
        id,
        label,
        execute: (context) => {
          const target = targetOf(context);
          if (target === null) return;
          this.splitTab(target.paneId, target.tabId, position);
        },
      });
    };
    registerSplit("shell.tab.splitLeft", "탭: 왼쪽으로 분할", "left");
    registerSplit("shell.tab.splitRight", "탭: 오른쪽으로 분할", "right");
    registerSplit("shell.tab.splitTop", "탭: 위로 분할", "top");
    registerSplit("shell.tab.splitBottom", "탭: 아래로 분할", "bottom");

    commands.actions.add({
      id: "shell.tab.close",
      label: "탭: 닫기",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.requestCloseTab(target.paneId, target.tabId);
      },
    });

    commands.actions.add({
      id: "shell.tab.closeOthers",
      label: "탭: 다른 탭 모두 닫기",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.closeOthers(target.paneId, target.tabId);
      },
    });

    commands.actions.add({
      id: "shell.tab.closeToRight",
      label: "탭: 오른쪽 탭 모두 닫기",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.closeToRight(target.paneId, target.tabId);
      },
    });

    commands.actions.add({
      id: "shell.tab.copyPath",
      label: "탭: 경로 복사",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        const tab = collectTabs(this.layoutState.tree).find((open) => open.id === target.tabId);
        this.#copyToClipboard(tab === undefined ? target.tabId : tab.uri.path);
      },
    });

    commands.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.splitLeft", order: 0 });
    commands.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.splitRight", order: 1 });
    commands.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.splitTop", order: 2 });
    commands.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.splitBottom", order: 3 });
    commands.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.close", order: 4 });
    commands.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.closeOthers", order: 5 });
    commands.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.closeToRight", order: 6 });
    commands.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.copyPath", order: 7 });
  }
}
