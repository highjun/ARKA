import { URI } from "#contracts";
import type { ICommandService } from "#core/commands";
import type { Container, Disposable } from "#core/di";
import { makeAutoObservable, observable, observableRef, reaction } from "mobx";
import type { ITabLayout, OpenTab, PaneId, PaneLeaf, PaneNode, SplitOrientation } from "../model/ITabLayout";
import type { ITabSystem } from "../model/ITabSystem";
import { collectTabs, findLeaf, firstLeafId, neighbourOf, pruneTree, replaceLeaf } from "../model/paneTree";
import { ROOT_PANE_ID } from "../model/tabsShare";
import type { ITabSystemViewModel, PaneRowNode, SplitEdge, TabContextTarget, TabRow } from "./ITabSystemViewModel";

/** descriptor가 아직 없는 탭(복원 중)의 본문 자리 — 빈 채로 둔다. */
const EmptyContent = () => null;

/**
 * `ITabSystemViewModel`의 유일한 구현체. 탭 Model(`ITabLayout`)을 구독해 화면용 트리로 펴고, 조작의 판단을 든다.
 * 탭 우클릭 메뉴 명령(`shell.tab.*`)도 여기서 등록한다.
 */
export class TabSystemViewModel implements ITabSystemViewModel {
  /** 트리 전체가 빈 leaf 하나로 무너졌을 때(전부 닫힘) 되돌아갈 자리 — Model 의 초기 상태와 같다. */
  static readonly #EMPTY_ROOT: PaneNode = { kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null };

  readonly #layout: ITabLayout;
  readonly #tabs: ITabSystem;
  readonly #copyToClipboard: (text: string) => void;
  readonly #subscriptions: Disposable[] = [];
  /** 탭 Model의 스냅샷 — `tree`는 여기에 descriptor(제목·더티·아이콘·본문)를 겹쳐 파생한다. */
  private layoutState: { readonly tree: PaneNode; readonly previewTabId: string | null };
  private activePaneIdState: PaneId;
  /** `requestCloseTab`이 확인을 구하는 동안 담아 두는 대상 — `confirmClose`/`cancelClose`가 지운다. */
  private pendingCloseState: { paneId: PaneId; tabId: string } | null = null;

  /** Model을 구독하고 탭 명령을 등록한다. 미리보기 탭이 더러워지는 순간 고정하는 reaction도 여기서 건다. */
  constructor({
    tabLayout,
    tabs,
    commands,
    copyToClipboard,
  }: {
    tabLayout: ITabLayout;
    tabs: ITabSystem;
    commands: ICommandService;
    /** `no-restricted-globals`가 ViewModel의 `navigator` 직접 참조를 막는다 — 조립부가 이 얇은 함수를 주입한다. */
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
      // 복원이 끝나 descriptor가 뒤늦게 붙으면 제목·아이콘이 달라진다 — 다시 계산만 한다.
      tabs.onDidChange(() => this.recompute()),
      // 미리보기 탭이 더러워지는 순간 고정한다 — 편집을 시작한 파일이 기울임(아직 안 읽어본 파일)으로 남으면 뜻이 어긋난다.
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

  /** 탭 Model의 스냅샷에 descriptor를 겹친다 — descriptor는 observable이라 더티·제목이 바뀌면 따라온다. */
  get tree(): PaneRowNode {
    return this.#toRowTree(this.layoutState.tree, this.layoutState.previewTabId);
  }

  /** `activePaneIdState`를 값으로 노출한다. */
  get activePaneId(): PaneId {
    return this.activePaneIdState;
  }

  /** 활성 칸 기준이다. 열린 탭이 없으면 `null`. */
  get activeTab(): { readonly id: string; readonly kind: string } | null {
    const leaf = findLeaf(this.layoutState.tree, this.activePaneIdState);
    const active = leaf?.tabs.find((tab) => tab.id === leaf.activeTabId);
    return active === undefined ? null : { id: active.id, kind: active.kind };
  }

  /** 존재하지 않는 칸·탭 요청은 무시한다. */
  selectTab(paneId: PaneId, tabId: string): void {
    const tree = this.#layout.tree;
    const leaf = findLeaf(tree, paneId);
    // 없는 칸·탭을 고르는 요청은 무시한다 — 활성 탭이 목록 밖을 가리키면 View 가 그릴 것을 잃는다.
    if (!leaf || !leaf.tabs.some((tab) => tab.id === tabId)) return;

    const nextTree = replaceLeaf(tree, paneId, (l) => ({ ...l, activeTabId: tabId }));
    this.#commit(nextTree, paneId);
  }

  /** 탭을 닫고, 필요하면 이웃 탭으로 활성을 옮긴 뒤 트리를 정리해 반영한다. */
  closeTab(paneId: PaneId, tabId: string): void {
    const tree = this.#layout.tree;
    const leaf = findLeaf(tree, paneId);
    if (!leaf) return;
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;

    const remaining = leaf.tabs.filter((tab) => tab.id !== tabId);
    // 활성이 아닌 탭을 닫았다면 활성은 그대로다 — 보고 있던 것이 바뀌면 안 된다.
    const nextActiveTabId = leaf.activeTabId === tabId ? neighbourOf(remaining, index) : leaf.activeTabId;
    const nextTree = replaceLeaf(tree, paneId, (l) => ({ ...l, tabs: remaining, activeTabId: nextActiveTabId }));

    if (this.#layout.previewTabId === tabId) this.#layout.setPreviewTabId(null);
    // 닫은 leaf 가 이걸로 비어 사라질 수 있다(#commit 이 정리한다) — 그때는 포커스가 다른 pane 으로
    // 넘어가야 하니 "지금 활성 leaf"를 선호값으로 넘긴다(닫은 leaf 가 활성이 아니었으면 그대로 유지된다).
    this.#commit(nextTree, this.#layout.activePaneId);
  }

  /** `pendingCloseState`를 값으로 노출한다. */
  get pendingClose(): { readonly paneId: PaneId; readonly tabId: string } | null {
    return this.pendingCloseState;
  }

  /** 더티가 아니면 바로 `closeTab`, 더티면 `pendingClose`에 담아 확인을 기다린다. */
  requestCloseTab(paneId: PaneId, tabId: string): void {
    if (!this.#isDirty(tabId)) {
      this.closeTab(paneId, tabId);
      return;
    }
    this.pendingCloseState = { paneId, tabId };
  }

  /** `pendingClose`에 담긴 대상으로 `closeTab`을 부른다. */
  confirmClose(): void {
    const pending = this.pendingCloseState;
    this.pendingCloseState = null;
    if (pending === null) return;
    this.closeTab(pending.paneId, pending.tabId);
  }

  /** `pendingClose`를 비운다. */
  cancelClose(): void {
    this.pendingCloseState = null;
  }

  /** `paneId`에서 `tabId`와 더티인 탭을 뺀 나머지를 닫는다 — 저장 안 된 변경을 잃지 않는다. */
  closeOthers(paneId: PaneId, tabId: string): void {
    const tree = this.#layout.tree;
    const leaf = findLeaf(tree, paneId);
    if (!leaf || !leaf.tabs.some((tab) => tab.id === tabId)) return;

    const kept = leaf.tabs.filter((tab) => tab.id === tabId || this.#isDirty(tab.id));
    // 닫을 게 없다
    if (kept.length === leaf.tabs.length) return;
    this.#closeMany(paneId, leaf, kept, tabId);
  }

  /** `paneId`에서 `tabId`보다 뒤에 있는 탭 중 더티가 아닌 것을 닫는다. */
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

  /**
   * `closeOtherTabs`/`closeTabsToRight`가 공유하는 마무리 — 닫힌 탭 중 미리보기가 있었으면
   * 지우고, 활성 탭이 닫혔으면 `fallbackActiveTabId`(호출부가 이미 "남기기로 한" 탭)로 옮긴다.
   */
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

  /** 개수가 안 맞으면(Model과 어긋나면) 무시하고, 맞으면 새 순서를 반영한다. */
  reorderTabs(paneId: PaneId, nextTabIds: readonly string[]): void {
    const tree = this.#layout.tree;
    const leaf = findLeaf(tree, paneId);
    if (!leaf) return;

    const byId = new Map(leaf.tabs.map((tab) => [tab.id, tab] as const));
    const reordered = nextTabIds.map((id) => byId.get(id)).filter((tab): tab is OpenTab => tab !== undefined);
    // 개수가 안 맞으면 View 가 들고 있던 탭 집합이 Model 과 어긋난 것이다 — 무시한다.
    if (reordered.length !== leaf.tabs.length) return;

    const nextTree = replaceLeaf(tree, paneId, (l) => ({ ...l, tabs: reordered }));
    this.#layout.setTree(nextTree);
  }

  /** 새 leaf를 만들어 분할하고, 새로 생긴 pane으로 포커스를 옮긴다. */
  splitTab(sourceLeafId: PaneId, tabId: string, position: SplitEdge): void {
    const tree = this.#layout.tree;
    const sourceLeaf = findLeaf(tree, sourceLeafId);
    if (!sourceLeaf) return;
    const movedTab = sourceLeaf.tabs.find((tab) => tab.id === tabId);
    if (!movedTab) return;

    const remaining = sourceLeaf.tabs.filter((tab) => tab.id !== tabId);
    const updatedSource: PaneLeaf = {
      kind: "leaf",
      id: sourceLeaf.id,
      tabs: remaining,
      activeTabId: sourceLeaf.activeTabId === tabId ? (remaining[0]?.id ?? null) : sourceLeaf.activeTabId,
    };
    // 결정적인 id다(타임스탬프·난수 없음) — 같은 leaf에서 같은 탭을 분할하는 조작은 그 사이에
    // 이전 결과가 닫혀 있어야만 다시 일어날 수 있어 충돌하지 않는다.
    const newLeafId = `${sourceLeafId}-split-${tabId}`;
    const newLeaf: PaneLeaf = { kind: "leaf", id: newLeafId, tabs: [movedTab], activeTabId: tabId };
    const orientation: SplitOrientation = position === "left" || position === "right" ? "horizontal" : "vertical";
    // position이 왼쪽/위면 새 leaf가 먼저 그려지는 자리, 오른쪽/아래면 나중 자리 — 드롭한 가장자리
    // 쪽에 새 패널이 생기는 게 자연스럽다.
    const children = position === "left" || position === "top" ? [newLeaf, updatedSource] : [updatedSource, newLeaf];
    const splitNode: PaneNode = { kind: "split", id: `${sourceLeafId}-split-root`, orientation, children };

    const nextTree = replaceLeaf(tree, sourceLeafId, () => splitNode);
    // 방금 떼어낸 탭이 있는 새 pane 으로 포커스를 옮긴다 — 드래그해서 분할했으면 그쪽을 보려던 것이다.
    this.#commit(nextTree, newLeafId);
  }

  /** `branchId` 가지 안 `childId` 자식의 비율을 바꾼다. */
  resizePane(branchId: PaneId, childId: PaneId, nextSize: number): void {
    const tree = this.#layout.tree;
    this.#layout.setTree(this.#resizeChild(tree, branchId, childId, nextSize));
  }

  /**
   * `file:` 탭의 경로를 전부 새 접두사로 옮긴다. id가 uri라 id도 바뀌고, 활성·미리보기 포인터도 따라간다.
   * 옮긴 탭은 provider에게 다시 물어 그릴 것을 받는다 — 옛 descriptor는 옛 경로를 쥐고 있다.
   */
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
    // 바뀐 게 없으면 새 트리를 만들지 않는다 — 참조로 변경을 알리므로 관련 없는 구독자까지 다시 그린다.
    if (moved.size === 0) return;

    this.#layout.setTree(this.#retargetTree(tree, moved));
    const preview = this.#layout.previewTabId;
    const movedPreview = preview === null ? undefined : moved.get(preview);
    if (movedPreview !== undefined) this.#layout.setPreviewTabId(movedPreview.id);
    void this.#tabs.restore([...moved.values()]);
  }

  /** 미리보기 탭이면 `previewTabId`를 비워 고정한다 — 미리보기 자리는 트리 전체에서 하나뿐이라 칸을 몰라도 된다. */
  pinTab(tabId: string): void {
    if (this.#layout.previewTabId === tabId) this.#layout.setPreviewTabId(null);
  }

  /** `ITabSystem.containerOf`에 그대로 위임한다. */
  containerOf(tabId: string): Container {
    return this.#tabs.containerOf(tabId);
  }

  /** 구독과 reaction을 끊는다. 컨테이너가 이 VM을 정리할 때 불린다. */
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

  /** 그 탭의 descriptor가 말하는 더티. descriptor가 아직 없으면(복원 중) 더럽지 않다. */
  #isDirty(tabId: string): boolean {
    return this.#tabs.descriptorOf(tabId)?.isDirty ?? false;
  }

  /** Model 의 트리를 화면용 트리로 바꾼다 — 칸의 탭마다 `isPreview`·`isDirty`·제목·아이콘·본문을 붙인다. */
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

  /** 트리를 정리(빈 leaf 걷어내기)해 반영하고, 선호하는 leaf 가 살아남았으면 그리로, 아니면 첫 leaf 로 포커스를 맞춘다. */
  #commit(tree: PaneNode, preferredActiveLeafId: PaneId): void {
    const pruned = pruneTree(tree) ?? TabSystemViewModel.#EMPTY_ROOT;
    this.#layout.setTree(pruned);
    const activeLeafId = findLeaf(pruned, preferredActiveLeafId) ? preferredActiveLeafId : firstLeafId(pruned);
    this.#layout.setActivePaneId(activeLeafId);
  }

  /** 경로의 마지막 조각. 폰의 탭 스트립에는 경로 전체가 들어가지 않는다. */
  #nameOf(path: string): string {
    return path.split("/").pop() ?? path;
  }

  /**
   * 탭이 다루는 명령 전부 — 분할·닫기 계열·경로 복사. 우클릭이면 클릭한 탭이 `context`로 오고, 키보드/팔레트
   * 실행이면 지금 보고 있는 탭이 대상이다. 우클릭 메뉴(`menuId: 'shell.tab.context'`)는 `ShellView`가 이
   * 레지스트리를 조회해 항목만 그린다. 순서는 분할 → 닫기 계열 → 복사.
   */
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

    /** 우클릭이면 클릭한 탭이 이미 `context`로 온다 — 키보드/팔레트 실행이면 지금 보고 있는 탭으로 대신한다. */
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
      // 탭 id는 uri다 — 복사하는 것은 그 uri의 경로(워크스페이스 루트 기준)다.
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        const tab = collectTabs(this.layoutState.tree).find((open) => open.id === target.tabId);
        this.#copyToClipboard(tab === undefined ? target.tabId : tab.uri.path);
      },
    });

    /**
     * 탭 우클릭 메뉴(`menuId: 'shell.tab.context'`) — `ShellView`가 `CommandContextMenu` 대신 이
     * registry를 직접 조회해 `Tab.renderTabContextMenu` 자리에 항목만 그린다(그 자리는 이미
     * `Menu.Content` 안이라 `CommandContextMenu`가 감싸는 `Trigger`가 중복된다). 순서는
     * 분할 → 닫기 계열 → 복사.
     */
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
