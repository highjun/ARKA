import type { Disposable } from "#core/di";
import { makeAutoObservable, observable, observableRef } from "mobx";
import type { ITabDirtyState } from "../model/ITabDirtyState";
import type { IWorkbenchStartup } from "../model/IWorkbenchStartup";
import { URI } from "#contracts";
import type { INotifications } from "../model/INotifications";
import type { IAppLifetime } from "../model/IAppLifetime";
import type { IWorkspace } from "../model/IWorkspace";
import type { IActivityBarRegistry } from "../model/IActivityBarRegistry";
import type { IActivityModel } from "../model/IActivityModel";
import type { ICommandService } from "#core/commands";
import { ROOT_PANE_ID } from "../model/tabsShare";
import type { ITabLayout, OpenTab, PaneId, PaneLeaf, PaneNode, SplitOrientation } from "../model/ITabLayout";
import { findLeaf, firstLeafId, neighbourOf, pruneTree, replaceLeaf } from "../model/paneTree";
import type { IColorMode, Mode } from "../model/IColorMode";
import type {
  ShellActivityRow,
  ShellTabPaneNode,
  ShellTabRow,
  IShellViewModel,
  SplitEdgeDropPosition,
  TabContextTarget,
  ShellNotificationRow,
} from "./IShellViewModel";

/** 셸 전체가 보는 하나의 ViewModel. 탭·활동·테마·알림 Model을 구독해 화면이 쓸 값으로 편다. */
export class ShellViewModel implements IShellViewModel {
  /** 트리 전체가 빈 leaf 하나로 무너졌을 때(전부 닫힘) 되돌아갈 자리 — Model 의 초기 상태와 같다. */
  static readonly #EMPTY_ROOT: PaneNode = { kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null };

  readonly #activityModel: IActivityModel;
  readonly #tabLayout: ITabLayout;
  readonly #subscriptions: readonly Disposable[];
  readonly #colorMode: IColorMode;
  readonly #activityBar: IActivityBarRegistry;
  /**
   * 열린 파일들을 감시하는 생명주기만 여기서 잡는다(다른 필드는 아무 것도 안 쓴다) — 파일 감시
   * ("열려 있는 동안"이라는 개념)가 탭 단위가 아니라 **앱 전체 단위**이기 때문이다(비활성 탭의
   * 파일도 감시 대상이어야 하는데, 비활성 탭은 렌더 자체가 안 될 수 있다). Shell은 앱 전체에서
   * 한 번만 만들어지는 루트라, 그 수명(생성자/`dispose`)에 얹는 게 정확히 "앱이 사는
   * 동안"과 같다. 탭 ViewModel에 얹지 않는 이유 — 그건 탭마다 마운트/언마운트되는
   * `FileContentView`가 부르므로, 탭 하나만 닫혀도 감시가 통째로 꺼진다(2026-09-04).
   */
  readonly #tabDirtyState: ITabDirtyState;
  readonly #startup: IWorkbenchStartup;
  readonly #appLifetime: IAppLifetime;
  readonly #workspace: IWorkspace;
  private buildIdState = "";
  private workspaceNameState = "";
  private isClientOutdatedState = false;
  readonly #notifications: INotifications;
  private notificationRows: readonly ShellNotificationRow[];
  private revealState: IShellViewModel["reveal"] = null;
  #revealSeq = 0;
  private activityRows: readonly ShellActivityRow[];
  private treeState: ShellTabPaneNode;
  private activeLeafIdState: PaneId;
  /**
   * 이 ViewModel 이 갖는 유일한 자기 상태다.
   *
   * 나머지는 전부 Model 에서 파생하지만, 드로어 개폐는 **모바일 전용 표현 상태**라 Model
   * (직렬화·지속의 대상)에 둘 것이 아니다. 그러면서도 컴포넌트에 맡길 수는 없다 — 파일을 열면
   * 닫아야 한다는 규칙을 아는 곳이 여기뿐이라서다.
   */
  private isSidebarOpenState = false;
  /** `requestCloseTab`이 확인을 구하는 동안 담아 두는 대상 — `confirmCloseTab`/`cancelCloseTab`이 지운다. */
  private pendingTabCloseState: { leafId: PaneId; tabId: string } | null = null;
  /** 옛 `CommandCenterModel`에서 옮겨온 유일한 상태(2026-09-05) — `IShellViewModel.isPaletteOpen` 참고. */
  private isPaletteOpenState = false;
  private themeState: Mode;
  readonly #copyToClipboard: (text: string) => void;

  /** Model들을 받아 각각 구독한다 — 여기서 만든 atom이 화면 갱신의 유일한 통로다. */
  constructor({
    activityModel,
    tabLayout,
    colorMode,
    activityBarRegistry,
    tabDirtyState,
    startup,
    appLifetime,
    workspace,
    notifications,
    commandCenterRegistry,
    copyToClipboard,
  }: {
    activityModel: IActivityModel;
    tabLayout: ITabLayout;
    colorMode: IColorMode;
    activityBarRegistry: IActivityBarRegistry;
    tabDirtyState: ITabDirtyState;
    startup: IWorkbenchStartup;
    appLifetime: IAppLifetime;
    workspace: IWorkspace;
    notifications: INotifications;
    commandCenterRegistry: ICommandService;
    /** `no-restricted-globals`가 ViewModel의 `navigator` 직접 참조를 막는다 — 조립부(`registerServices.tsx`,
     *  대상 아님)가 이 얇은 함수를 주입한다(`DirectoryTreeViewModel`과 같은 패턴). */
    copyToClipboard: (text: string) => void;
  }) {
    this.#activityModel = activityModel;
    this.#tabLayout = tabLayout;
    this.#colorMode = colorMode;
    this.#activityBar = activityBarRegistry;
    this.#tabDirtyState = tabDirtyState;
    this.#startup = startup;
    this.#appLifetime = appLifetime;
    this.#workspace = workspace;
    this.#notifications = notifications;
    this.#copyToClipboard = copyToClipboard;
    this.notificationRows = this.#computeNotifications();

    // Model은 값과 이벤트만 준다 — 파생된 화면 상태(atom)는 전부 여기서 소유한다.
    this.activityRows = this.#computeActivities();
    this.treeState = this.#computeTree();
    this.activeLeafIdState = tabLayout.activePaneId;
    this.themeState = colorMode.mode;

    this.#subscriptions = [
      activityModel.onDidChange(() => this.recompute()),
      tabLayout.onDidChange(() => this.recompute()),
      colorMode.onDidChange(() => this.recompute()),
      // dirty가 바뀌면 탭 표시가 달라진다 — 무엇이 더러워졌는지는 모르고 다시 계산만 한다.
      tabDirtyState.onDidChange(() => this.recompute()),
      notifications.onDidChange(() => this.syncNotifications()),
      appLifetime.onDidChange(() => this.recomputeLifetime()),
      workspace.onDidChange(() => this.syncWorkspace()),
    ];

    // 상태는 참조로만 관찰한다 — 매번 새 값을 통째로 넣으므로 깊이 감쌀 이유가 없고, 화면은 plain 값을 받는다.
    makeAutoObservable<
      this,
      | "activityRows"
      | "treeState"
      | "notificationRows"
      | "revealState"
      | "pendingTabCloseState"
      | "activeLeafIdState"
      | "themeState"
      | "buildIdState"
      | "workspaceNameState"
      | "isClientOutdatedState"
      | "isSidebarOpenState"
      | "isPaletteOpenState"
    >(
      this,
      {
        activityRows: observableRef,
        treeState: observableRef,
        notificationRows: observableRef,
        revealState: observableRef,
        pendingTabCloseState: observableRef,
        activeLeafIdState: observable,
        themeState: observable,
        buildIdState: observable,
        workspaceNameState: observable,
        isClientOutdatedState: observable,
        isSidebarOpenState: observable,
        isPaletteOpenState: observable,
      },
      { autoBind: true },
    );

    this.#registerCommands(commandCenterRegistry);

    // 만들어지는 순간이 곧 "앱이 사는 동안"의 시작이다 — Shell은 앱에 하나고 컨테이너가 살아 있는 한 산다.
    startup.start();
    void appLifetime.load();
    void workspace.load();
  }

  /** `#activities`를 값으로 노출한다. */
  get activities(): readonly ShellActivityRow[] {
    return this.activityRows;
  }

  /** `#tree`를 값으로 노출한다. */
  get tree(): ShellTabPaneNode {
    return this.treeState;
  }

  /** `#activeLeafId`를 값으로 노출한다. */
  get activeLeafId(): PaneId {
    return this.activeLeafIdState;
  }

  /** 같은 활동을 다시 고르면 닫는다 — 폰에서 사이드바를 접는 유일한 수단이다. */
  selectActivity(id: string): void {
    // 화면에서 오는 id 는 문자열이다. Registry 가 아는 것만 통과시킨다.
    if (!this.#isActivityId(id)) return;
    // 같은 활동을 다시 고르면 닫는다 — 폰에서 사이드바를 접는 유일한 수단이다.
    const current = this.#activityModel.activeActivityId;
    this.#activityModel.setActiveActivityId(current === id ? null : id);
  }

  /** 모르는 id면 아무 일도 안 한다. 활동을 고르면 사이드바가 함께 열린다. */
  showActivity(id: string): void {
    if (!this.#isActivityId(id)) return;
    this.#activityModel.setActiveActivityId(id);
    this.setSidebarOpen(true);
  }

  /** 존재하지 않는 leaf·탭 요청은 무시한다. */
  selectTab(leafId: PaneId, tabId: string): void {
    const tree = this.#tabLayout.tree;
    const leaf = findLeaf(tree, leafId);
    // 없는 leaf·탭을 고르는 요청은 무시한다 — 활성 탭이 목록 밖을 가리키면 View 가 그릴 것을 잃는다.
    if (!leaf || !leaf.tabs.some((tab) => tab.id === tabId)) return;

    const nextTree = replaceLeaf(tree, leafId, (l) => ({ ...l, activeTabId: tabId }));
    this.#commit(nextTree, leafId);
  }

  /** 탭을 닫고, 필요하면 이웃 탭으로 활성을 옮긴 뒤 트리를 정리해 반영한다. */
  closeTab(leafId: PaneId, tabId: string): void {
    const tree = this.#tabLayout.tree;
    const leaf = findLeaf(tree, leafId);
    if (!leaf) return;
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;

    const remaining = leaf.tabs.filter((tab) => tab.id !== tabId);
    // 활성이 아닌 탭을 닫았다면 활성은 그대로다 — 보고 있던 것이 바뀌면 안 된다.
    const nextActiveTabId = leaf.activeTabId === tabId ? neighbourOf(remaining, index) : leaf.activeTabId;
    const nextTree = replaceLeaf(tree, leafId, (l) => ({ ...l, tabs: remaining, activeTabId: nextActiveTabId }));

    if (this.#tabLayout.previewTabId === tabId) this.#tabLayout.setPreviewTabId(null);
    // 닫은 leaf 가 이걸로 비어 사라질 수 있다(#commit 이 정리한다) — 그때는 포커스가 다른 pane 으로
    // 넘어가야 하니 "지금 활성 leaf"를 선호값으로 넘긴다(닫은 leaf 가 활성이 아니었으면 그대로 유지된다).
    this.#commit(nextTree, this.#tabLayout.activePaneId);
  }

  /** `#pendingTabClose`를 값으로 노출한다. */
  get pendingTabClose(): { readonly leafId: PaneId; readonly tabId: string } | null {
    return this.pendingTabCloseState;
  }

  /** `isDirty`가 거짓이면 바로 `closeTab`, 참이면 `#pendingTabClose`에 담아 확인을 기다린다. */
  requestCloseTab(leafId: PaneId, tabId: string): void {
    const isDirty = this.#tabDirtyState.isDirty(tabId);
    if (!isDirty) {
      this.closeTab(leafId, tabId);
      return;
    }
    this.pendingTabCloseState = { leafId, tabId };
  }

  /** `#pendingTabClose`에 담긴 대상으로 `closeTab`을 호출한다. */
  confirmCloseTab(): void {
    const pending = this.pendingTabCloseState;
    this.pendingTabCloseState = null;
    if (pending === null) return;
    this.closeTab(pending.leafId, pending.tabId);
  }

  /** `#pendingTabClose`를 비운다. */
  cancelCloseTab(): void {
    this.pendingTabCloseState = null;
  }

  /** `leafId`에서 `tabId`와 `protectedTabIds`를 뺀 나머지를 닫는다. */
  closeOtherTabs(leafId: PaneId, tabId: string, protectedTabIds: readonly string[] = []): void {
    const tree = this.#tabLayout.tree;
    const leaf = findLeaf(tree, leafId);
    if (!leaf || !leaf.tabs.some((tab) => tab.id === tabId)) return;

    const kept = leaf.tabs.filter((tab) => tab.id === tabId || protectedTabIds.includes(tab.id));
    // 닫을 게 없다
    if (kept.length === leaf.tabs.length) return;
    this.#closeMany(leafId, leaf, kept, tabId);
  }

  /** `leafId`에서 `tabId`보다 뒤에 있는 탭 중 `protectedTabIds`를 뺀 나머지를 닫는다. */
  closeTabsToRight(leafId: PaneId, tabId: string, protectedTabIds: readonly string[] = []): void {
    const tree = this.#tabLayout.tree;
    const leaf = findLeaf(tree, leafId);
    if (!leaf) return;
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;

    const closable = new Set(
      leaf.tabs
        .slice(index + 1)
        .filter((tab) => !protectedTabIds.includes(tab.id))
        .map((tab) => tab.id),
    );
    if (closable.size === 0) return;
    const kept = leaf.tabs.filter((tab) => !closable.has(tab.id));
    this.#closeMany(leafId, leaf, kept, tabId);
  }

  /**
   * `closeOtherTabs`/`closeTabsToRight`가 공유하는 마무리 — 닫힌 탭 중 미리보기가 있었으면
   * 지우고, 활성 탭이 닫혔으면 `fallbackActiveTabId`(호출부가 이미 "남기기로 한" 탭)로 옮긴다.
   */
  #closeMany(leafId: PaneId, leaf: PaneLeaf, kept: readonly OpenTab[], fallbackActiveTabId: string): void {
    const closedIds = new Set(leaf.tabs.filter((tab) => !kept.includes(tab)).map((tab) => tab.id));
    const nextActiveTabId =
      leaf.activeTabId !== null && closedIds.has(leaf.activeTabId) ? fallbackActiveTabId : leaf.activeTabId;
    const tree = this.#tabLayout.tree;
    const nextTree = replaceLeaf(tree, leafId, (l) => ({ ...l, tabs: kept, activeTabId: nextActiveTabId }));

    const preview = this.#tabLayout.previewTabId;
    if (preview !== null && closedIds.has(preview)) this.#tabLayout.setPreviewTabId(null);
    this.#commit(nextTree, this.#tabLayout.activePaneId);
  }

  /** 개수가 안 맞으면(Model과 어긋나면) 무시하고, 맞으면 새 순서를 반영한다. */
  reorderTabs(leafId: PaneId, nextTabIds: readonly string[]): void {
    const tree = this.#tabLayout.tree;
    const leaf = findLeaf(tree, leafId);
    if (!leaf) return;

    const byId = new Map(leaf.tabs.map((tab) => [tab.id, tab] as const));
    const reordered = nextTabIds.map((id) => byId.get(id)).filter((tab): tab is OpenTab => tab !== undefined);
    // 개수가 안 맞으면 View 가 들고 있던 탭 집합이 Model 과 어긋난 것이다 — 무시한다.
    if (reordered.length !== leaf.tabs.length) return;

    const nextTree = replaceLeaf(tree, leafId, (l) => ({ ...l, tabs: reordered }));
    this.#tabLayout.setTree(nextTree);
  }

  /** 새 leaf를 만들어 분할하고, 새로 생긴 pane으로 포커스를 옮긴다. */
  splitTab(sourceLeafId: PaneId, tabId: string, position: SplitEdgeDropPosition): void {
    const tree = this.#tabLayout.tree;
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

  /** `#tabLayout.setTree`로 리사이즈 결과를 반영한다. */
  resizeNode(branchId: PaneId, childId: PaneId, nextSize: number): void {
    const tree = this.#tabLayout.tree;
    this.#tabLayout.setTree(this.#resizeChild(tree, branchId, childId, nextSize));
  }

  /** 트리와 미리보기 탭의 경로를 전부 새 접두사로 옮긴다. */
  retargetTabs(oldPrefix: string, newPrefix: string): void {
    const retarget = (id: string): string => {
      if (id === oldPrefix) return newPrefix;
      if (id.startsWith(`${oldPrefix}/`)) return `${newPrefix}${id.slice(oldPrefix.length)}`;
      return id;
    };

    const tree = this.#tabLayout.tree;
    const nextTree = this.#retargetTree(tree, retarget);
    // 바뀐 게 없으면 새 트리를 만들지 않는다 — atom은 참조로 변경을 알리므로, 매번 새 트리를
    // 주면 관련 없는 구독자까지 다시 그린다.
    if (nextTree !== tree) this.#tabLayout.setTree(nextTree);

    const preview = this.#tabLayout.previewTabId;
    if (preview !== null) {
      const nextPreview = retarget(preview);
      if (nextPreview !== preview) this.#tabLayout.setPreviewTabId(nextPreview);
    }
  }

  /** `#isSidebarOpen`을 값으로 노출한다. */
  get isSidebarOpen(): boolean {
    return this.isSidebarOpenState;
  }

  /** `#isSidebarOpen`에 값을 반영한다. */
  setSidebarOpen(open: boolean): void {
    this.isSidebarOpenState = open;
  }

  /** `#isPaletteOpen`을 값으로 노출한다. */
  get isPaletteOpen(): boolean {
    return this.isPaletteOpenState;
  }

  /** `#isPaletteOpen`에 값을 반영한다. */
  setPaletteOpen(open: boolean): void {
    this.isPaletteOpenState = open;
  }

  /** `#theme`를 값으로 노출한다. */
  /** 화면 구석에 띄울 빌드 표시. 아직 못 읽었거나 실패했으면 빈 문자열이다. */
  get buildId(): string {
    return this.buildIdState;
  }

  /** 아직 서버 정보를 못 읽었으면 빈 문자열이다. */
  get workspaceName(): string {
    return this.workspaceNameState;
  }

  /** 서버 정보를 못 읽었으면 `false`다 — 모르면 낡았다고 말하지 않는다. */
  get isClientOutdated(): boolean {
    return this.isClientOutdatedState;
  }

  /** 앱 수명에 맡긴다 — 실제 새로고침은 그쪽이 주입받았다. */
  reloadApp(): void {
    this.#appLifetime.requestReload("userRequested");
  }

  /** 화면이 그릴 최소 필드만 남긴 행이다 — `at`은 여기서 빠진다. */
  get notifications(): readonly ShellNotificationRow[] {
    return this.notificationRows;
  }

  /** 없는 id면 조용히 넘어간다. */
  dismissNotification(id: string): void {
    this.#notifications.dismiss(id);
  }

  #computeNotifications(): readonly ShellNotificationRow[] {
    return this.#notifications.items.map(({ id, severity, message }) => ({ id, severity, message }));
  }

  /** `'light'` 또는 `'dark'`. View가 이 값을 문서에 칠한다. */
  get theme(): string {
    return this.themeState;
  }

  /** 현재 테마를 반전시켜 `#colorMode.setMode`을 호출한다. */
  toggleTheme(): void {
    this.#colorMode.setMode(this.#colorMode.mode === "dark" ? "light" : "dark");
  }

  /** 고정 탭으로 연다. 이미 있으면 그 탭을 활성으로만 만든다 — 미리보기 자리와 무관하다. */
  openTab(tab: OpenTab): void {
    const tree = this.#tabLayout.tree;
    const activeLeafId = this.#tabLayout.activePaneId;
    const leaf = findLeaf(tree, activeLeafId);
    if (!leaf) return;
    const open = tab;
    const already = leaf.tabs.some((existing) => existing.id === open.id);
    const nextTree = replaceLeaf(tree, activeLeafId, (l) => ({
      ...l,
      tabs: already ? l.tabs : [...l.tabs, open],
      activeTabId: open.id,
    }));
    this.#tabLayout.setTree(nextTree);
  }

  /** 활성 leaf 기준이다. 열린 탭이 없으면 `null`. */
  get activeTab(): { readonly id: string; readonly kind: string } | null {
    const leaf = findLeaf(this.#tabLayout.tree, this.#tabLayout.activePaneId);
    const active = leaf?.tabs.find((tab) => tab.id === leaf.activeTabId);
    return active === undefined ? null : { id: active.id, kind: active.kind };
  }

  /** 위치 요청이 없으면 `null`. 같은 위치를 다시 요청해도 `seq`로 구분된다. */
  get reveal(): IShellViewModel["reveal"] {
    return this.revealState;
  }

  /** 활성 leaf 기준으로 미리보기 탭을 열거나, 이미 열려 있으면 고정한다. `position`은 그 탭의 내용에 전달된다. */
  previewFile(path: string, position?: { readonly line: number; readonly column: number }): void {
    if (position !== undefined) {
      this.#revealSeq += 1;
      this.revealState = { tabId: path, line: position.line, column: position.column, seq: this.#revealSeq };
    }
    const tab: OpenTab = { id: path, kind: "file", uri: URI.file(path), title: this.#nameOf(path) };
    const tree = this.#tabLayout.tree;
    const activeLeafId = this.#tabLayout.activePaneId;
    const leaf = findLeaf(tree, activeLeafId);
    // activeLeafId 는 항상 존재하는 leaf 를 가리킨다(불변) — 방어적으로만 무시한다.
    if (!leaf) return;

    const already = leaf.tabs.some((open) => open.id === tab.id);
    let nextTree: PaneNode;

    if (already) {
      // 미리보기 자리에 있던 것을 다시 열었다 = 같은 것을 두 번 눌렀다 → 고정한다.
      if (this.#tabLayout.previewTabId === tab.id) this.#tabLayout.setPreviewTabId(null);
      nextTree = replaceLeaf(tree, activeLeafId, (l) => ({ ...l, activeTabId: tab.id }));
    } else {
      const replaced = this.#tabLayout.previewTabId;
      // 미리보기는 **자리 하나**다 — 밀어내는 게 아니라 갈아끼운다. 옛 미리보기 탭이 지금 이
      // leaf 에 있으면 걷어내고 갈아끼운다. 다른 pane 에 있으면 거기까지 건드리지 않는다 — 안 보고
      // 있는 다른 pane 의 탭을 이 leaf 의 조작만으로 지우는 건 사용자가 예상 못 할 부작용이다.
      // (그 탭은 그냥 조용히 "고정"된 채로 남는다, isPreview 만 꺼진다.)
      nextTree = replaceLeaf(tree, activeLeafId, (l) => ({
        ...l,
        tabs: [...l.tabs.filter((open) => open.id !== replaced), tab],
        activeTabId: tab.id,
      }));
      this.#tabLayout.setPreviewTabId(tab.id);
    }

    this.#tabLayout.setTree(nextTree);
    this.isSidebarOpenState = false;
  }

  /** 미리보기 탭이면 `previewTabId`를 비워 고정한다. */
  pinTab(tabId: string): void {
    // previewFile 의 "다시 열면 고정한다"와 같은 동작 — previewTabId 는 트리 전체에서 하나뿐인
    // 전역 자리라 leaf 를 몰라도 된다.
    if (this.#tabLayout.previewTabId === tabId) this.#tabLayout.setPreviewTabId(null);
  }

  /**
   * Shell이 다루는 커맨드 전부를 여기서 등록한다(2026-09-06, 옛 `app/shellCommands.ts` +
   * `registerServices.tsx`의 `wireBuiltinCommands`가 여기로 합쳐졌다) — "이 화면이 다루는 커맨드는
   * 이 화면의 ViewModel이 안다"로 방향을 바꿨다. `commandCenterRegistry`를 생성자에서 DI로
   * 받아, 자기 자신이 처음 만들어지는 순간(=Shell이 처음 마운트되는 순간, `.scoped()`라 scope당
   * 한 번) `this`로 직접 등록한다 — 예전처럼 "루트에서 resolve하면 유령 인스턴스가 된다"는 함정
   * 자체가 사라진다(등록이 항상 지금 만들어지는 바로 그 인스턴스를 캡처하기 때문). 이제
   * `registerServices.tsx`는 `commandCenterRegistryBinding`을 등록하기만 하면 되고, "scope를 만든
   * 다음에 불러야 한다"는 순서 제약 자체가 없어졌다.
   *
   * `dirtyTabIdsIn`이 `#tabDirtyState`(셸이 선언한 계약, 조립부가 채운다)를 본다 —
   * 저장 안 된 탭은 배치로 닫지 않는다.
   */
  #registerCommands(commandCenterRegistry: ICommandService): void {
    /**
     * 증명용 커맨드 — Command·Keybinding 배선이 실제로 동작하는지 보는 첫 사례로 남겨둔 것.
     * 테마 전환은 이미 `toggleTheme()`으로도 되지만, 커맨드로도 하나 등록해둔다(둘이 공존해도
     * 문제없다 — 커맨드는 그냥 또 다른 트리거일 뿐이다).
     */
    commandCenterRegistry.actions.add({
      id: "shell.toggleTheme",
      label: "테마 전환",
      execute: () => this.toggleTheme(),
    });
    commandCenterRegistry.keybindings.add({
      keybinding: "ctrl+j",
      actionId: "shell.toggleTheme",
    });

    /**
     * 팔레트를 여는 것 자체가 커맨드다 — VSCode의 `workbench.action.showCommands`와 같은 방식.
     * `execute`가 `setPaletteOpen`을 부르는 것 말고는 하는 일이 없다 — 옛
     * `commandCenterModel.setPaletteOpen`(2026-09-05, `ICommandService`로 분해되며
     * `IShellViewModel`로 옮겨왔다).
     */
    commandCenterRegistry.actions.add({
      id: "shell.openCommandPalette",
      label: "커맨드 팔레트 열기",
      execute: () => this.setPaletteOpen(true),
    });
    commandCenterRegistry.keybindings.add({
      keybinding: "ctrl+k",
      actionId: "shell.openCommandPalette",
    });

    // 활동마다 `<title> 보기` — VSCode의 `workbench.view.explorer`(Ctrl+Shift+E) 같은 것. 단축키는
    // 활동을 등록한 쪽이 descriptor에 적는다.
    for (const activity of this.#activityBar.list()) {
      const commandId = `shell.showActivity.${activity.id}`;
      commandCenterRegistry.actions.add({
        id: commandId,
        label: `${activity.title} 보기`,
        execute: () => this.showActivity(activity.id),
      });
      if (activity.keybinding !== undefined) {
        commandCenterRegistry.keybindings.add({
          keybinding: activity.keybinding,
          actionId: commandId,
        });
      }
    }

    commandCenterRegistry.actions.add({
      id: "shell.openSettings",
      label: "설정 열기",
      execute: () =>
        this.openTab({ id: "settings", kind: "settings", uri: URI.parse("arka:///settings"), title: "설정" }),
    });
    commandCenterRegistry.keybindings.add({
      keybinding: "ctrl+,",
      actionId: "shell.openSettings",
    });

    commandCenterRegistry.actions.add({
      id: "shell.openKeybindings",
      label: "키보드 단축키 보기",
      execute: () =>
        this.openTab({
          id: "keybindings",
          kind: "keybindings",
          uri: URI.parse("arka:///keybindings"),
          title: "키보드 단축키",
        }),
    });

    const isTabContextTarget = (value: unknown): value is TabContextTarget =>
      typeof value === "object" && value !== null && "leafId" in value && "tabId" in value;

    const findLeafTabs = (node: ShellTabPaneNode, leafId: PaneId): readonly ShellTabRow[] | undefined => {
      if (node.kind === "leaf") return node.id === leafId ? node.tabs : undefined;
      for (const child of node.children) {
        const found = findLeafTabs(child, leafId);
        if (found !== undefined) return found;
      }
      return undefined;
    };

    const findActiveTabId = (node: ShellTabPaneNode, leafId: PaneId): string | null => {
      if (node.kind === "leaf") return node.id === leafId ? node.activeTabId : null;
      for (const child of node.children) {
        const found = findActiveTabId(child, leafId);
        if (found !== null) return found;
      }
      return null;
    };

    /** 우클릭이면 클릭한 탭이 이미 `context`로 온다 — 키보드/팔레트 실행이면 지금 보고 있는 탭으로 대신한다. */
    const targetOf = (context: unknown): TabContextTarget | null => {
      if (isTabContextTarget(context)) return context;
      const leafId = this.activeLeafId;
      const activeTabId = findActiveTabId(this.tree, leafId);
      return activeTabId === null ? null : { leafId, tabId: activeTabId };
    };

    /** 이 leaf 안에서, 저장 안 된 변경이 있어 배치로 닫으면 안 되는 탭 id들. */
    const dirtyTabIdsIn = (leafId: PaneId): readonly string[] => {
      const tabs = findLeafTabs(this.tree, leafId) ?? [];
      return tabs.filter((tab) => this.#tabDirtyState.isDirty(tab.id)).map((tab) => tab.id);
    };

    const registerSplit = (id: string, label: string, position: SplitEdgeDropPosition): void => {
      commandCenterRegistry.actions.add({
        id,
        label,
        execute: (context) => {
          const target = targetOf(context);
          if (target === null) return;
          this.splitTab(target.leafId, target.tabId, position);
        },
      });
    };
    registerSplit("shell.tab.splitLeft", "탭: 왼쪽으로 분할", "left");
    registerSplit("shell.tab.splitRight", "탭: 오른쪽으로 분할", "right");
    registerSplit("shell.tab.splitTop", "탭: 위로 분할", "top");
    registerSplit("shell.tab.splitBottom", "탭: 아래로 분할", "bottom");

    commandCenterRegistry.actions.add({
      id: "shell.tab.close",
      label: "탭: 닫기",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.requestCloseTab(target.leafId, target.tabId);
      },
    });

    commandCenterRegistry.actions.add({
      id: "shell.tab.closeOthers",
      label: "탭: 다른 탭 모두 닫기",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.closeOtherTabs(target.leafId, target.tabId, dirtyTabIdsIn(target.leafId));
      },
    });

    commandCenterRegistry.actions.add({
      id: "shell.tab.closeToRight",
      label: "탭: 오른쪽 탭 모두 닫기",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.closeTabsToRight(target.leafId, target.tabId, dirtyTabIdsIn(target.leafId));
      },
    });

    commandCenterRegistry.actions.add({
      id: "shell.tab.copyPath",
      label: "탭: 경로 복사",
      // 탭 id가 곧 워크스페이스 루트 기준 경로다(`ShellTabRow` 계약 참고).
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.#copyToClipboard(target.tabId);
      },
    });

    /**
     * 탭 우클릭 메뉴(`menuId: 'shell.tab.context'`) — `ShellView`가 `CommandContextMenu` 대신 이
     * registry를 직접 조회해 `Tab.renderTabContextMenu` 자리에 항목만 그린다(그 자리는 이미
     * `Menu.Content` 안이라 `CommandContextMenu`가 감싸는 `Trigger`가 중복된다). 순서는
     * 분할 → 닫기 계열 → 복사.
     */
    commandCenterRegistry.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.splitLeft", order: 0 });
    commandCenterRegistry.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.splitRight", order: 1 });
    commandCenterRegistry.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.splitTop", order: 2 });
    commandCenterRegistry.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.splitBottom", order: 3 });
    commandCenterRegistry.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.close", order: 4 });
    commandCenterRegistry.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.closeOthers", order: 5 });
    commandCenterRegistry.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.closeToRight", order: 6 });
    commandCenterRegistry.menus.add({ menuId: "shell.tab.context", actionId: "shell.tab.copyPath", order: 7 });
  }

  /** Model 의 트리를 화면용 트리로 바꾼다 — leaf 의 탭마다 `isPreview`·`isDirty` 를 파생시킨다. */
  #toShellTree(node: PaneNode, previewId: string | null): ShellTabPaneNode {
    if (node.kind === "leaf") {
      return {
        kind: "leaf",
        id: node.id,
        tabs: node.tabs.map((tab) => ({
          id: tab.id,
          kind: tab.kind,
          title: tab.title,
          isPreview: tab.id === previewId,
          isDirty: this.#tabDirtyState.isDirty(tab.id),
        })),
        activeTabId: node.activeTabId,
        size: node.size,
      };
    }
    return {
      kind: "split",
      id: node.id,
      orientation: node.orientation,
      children: node.children.map((child) => this.#toShellTree(child, previewId)),
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

  #retargetTree(node: PaneNode, retarget: (id: string) => string): PaneNode {
    if (node.kind === "leaf") {
      const tabs = node.tabs.map((tab) => {
        const id = retarget(tab.id);
        if (id === tab.id) return tab;
        return { ...tab, id, uri: tab.uri.scheme === "file" ? URI.file(id) : tab.uri, title: this.#nameOf(id) };
      });
      const activeTabId = node.activeTabId === null ? null : retarget(node.activeTabId);
      const changed = activeTabId !== node.activeTabId || tabs.some((tab, index) => tab !== node.tabs[index]);
      return changed ? { ...node, tabs, activeTabId } : node;
    }
    const children = node.children.map((child) => this.#retargetTree(child, retarget));
    return children.some((child, index) => child !== node.children[index]) ? { ...node, children } : node;
  }

  /** 트리를 정리(빈 leaf 걷어내기)해 반영하고, 선호하는 leaf 가 살아남았으면 그리로, 아니면 첫 leaf 로 포커스를 맞춘다. */
  #commit(tree: PaneNode, preferredActiveLeafId: PaneId): void {
    const pruned = pruneTree(tree) ?? ShellViewModel.#EMPTY_ROOT;
    this.#tabLayout.setTree(pruned);
    const activeLeafId = findLeaf(pruned, preferredActiveLeafId) ? preferredActiveLeafId : firstLeafId(pruned);
    this.#tabLayout.setActivePaneId(activeLeafId);
  }

  /** 경로의 마지막 조각. 폰의 탭 스트립에는 경로 전체가 들어가지 않는다. */
  #nameOf(path: string): string {
    return path.split("/").pop() ?? path;
  }

  #isActivityId(id: string): boolean {
    return this.#activityBar.tryGet(id) !== undefined;
  }

  /** 구독을 끊고 시작 작업을 끈다. 컨테이너가 이 VM을 정리할 때 불린다 — 무엇이 꺼지는지는 조립부만 안다. */
  dispose(): void {
    for (const subscription of this.#subscriptions) subscription.dispose();
    this.#startup.stop();
  }

  private recomputeLifetime(): void {
    this.buildIdState = this.#appLifetime.buildId;
    this.isClientOutdatedState = this.#appLifetime.isOutdated;
  }

  private syncNotifications(): void {
    this.notificationRows = this.#computeNotifications();
  }

  private syncWorkspace(): void {
    this.workspaceNameState = this.#workspace.name;
  }

  private recompute(): void {
    this.activityRows = this.#computeActivities();
    this.treeState = this.#computeTree();
    this.activeLeafIdState = this.#tabLayout.activePaneId;
    this.themeState = this.#colorMode.mode;
  }

  #computeActivities() {
    const activeId = this.#activityModel.activeActivityId;
    return this.#activityBar
      .list()
      .map((entry) => ({ id: entry.id, title: entry.title, iconId: entry.iconId, isActive: entry.id === activeId }));
  }

  #computeTree() {
    return this.#toShellTree(this.#tabLayout.tree, this.#tabLayout.previewTabId);
  }
}
