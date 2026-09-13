import type { Disposable } from '#core/di';
import { ViewModelBase } from '#core/viewmodel';
import { atom } from 'nanostores';
import type { ITabDirtyState } from '../model/ITabDirtyState';
import type { IWorkbenchStartup } from '../model/IWorkbenchStartup';
import { PROTOCOL_HEADER, PROTOCOL_VERSION } from '#contracts';
import type { IServerInfo } from '../model/IServerInfo';
import type { INotificationService } from '../model/INotificationService';
import type { IActivityBarRegistry } from '../model/IActivityBarRegistry';
import type { IActivityModel } from '../model/IActivityModel';
import type { ICommandCenterRegistry } from '#core/commands';
import { ROOT_PANE_ID } from '../model/tabsShare';
import type { OpenTab, PaneId, TabPaneLeaf, TabPaneNode, TabSplitOrientation, ITabsModel } from '../model/ITabsModel';
import type { IThemeModel } from '../model/IThemeModel';
import type { ShellActivityRow, ShellTabPaneNode, ShellTabRow, IShellViewModel, SplitEdgeDropPosition, TabContextTarget, ShellNotificationRow } from './IShellViewModel';

/** `IShellViewModel`의 유일한 구현체 — `IActivityModel`·`ITabsModel`·`IThemeModel`을 조합해 화면 상태를 파생시킨다. */
/**
 * 빌드 표시 한 줄을 만든다 — 시각과, 있으면 커밋.
 *
 * 시각은 서버가 ISO로만 주고 형식은 여기서 정한다 — **보는 사람의 시간대로** 읽혀야 하기
 * 때문이다. 서버가 UTC로 굳혀 보내면 폰에서 시차를 머릿속으로 빼야 한다.
 *
 * 커밋은 **없을 수 있다**(소스에서 바로 띄운 서버). 없으면 시각만 남는다.
 */
const formatBuildLabel = (iso: string, gitSha?: string): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';

  const two = (value: number): string => String(value).padStart(2, '0');
  const time = `v${String(at.getFullYear())}.${two(at.getMonth() + 1)}.${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}`;
  // 앞 7자는 사람이 눈으로 옮겨 적는 길이다. `-dirty`는 그대로 남긴다 — 그게 신호다.
  return gitSha === undefined ? time : `${time} · ${gitSha.replace(/^([0-9a-f]{7})[0-9a-f]*/u, '$1')}`;
};

/** 셸 전체가 보는 하나의 ViewModel. 탭·활동·테마·알림 Model을 구독해 화면이 쓸 값으로 편다. */
export class ShellViewModel extends ViewModelBase implements IShellViewModel {
  /** 트리 전체가 빈 leaf 하나로 무너졌을 때(전부 닫힘) 되돌아갈 자리 — Model 의 초기 상태와 같다. */
  static readonly #EMPTY_ROOT: TabPaneNode = { kind: 'leaf', id: ROOT_PANE_ID, tabs: [], activeTabId: null };

  readonly #activityModel: IActivityModel;
  readonly #tabsModel: ITabsModel;
  readonly #subscriptions: readonly Disposable[];
  readonly #themeModel: IThemeModel;
  readonly #activityBar: IActivityBarRegistry;
  /**
   * 열린 파일들을 감시하는 생명주기만 여기서 잡는다(다른 필드는 아무 것도 안 쓴다) — 파일 감시
   * ("열려 있는 동안"이라는 개념)가 탭 단위가 아니라 **앱 전체 단위**이기 때문이다(비활성 탭의
   * 파일도 감시 대상이어야 하는데, 비활성 탭은 렌더 자체가 안 될 수 있다). Shell은 앱 전체에서
   * 한 번만 마운트되는 루트라, 그 생명주기(`onMount`/`onDispose`)에 얹는 게 정확히 "앱이 사는
   * 동안"과 같다. 탭 ViewModel에 얹지 않는 이유 — 그건 탭마다 마운트/언마운트되는
   * `FileContentView`가 부르므로, 탭 하나만 닫혀도 감시가 통째로 꺼진다(2026-09-04).
   */
  readonly #tabDirtyState: ITabDirtyState;
  readonly #startup: IWorkbenchStartup;
  readonly #serverInfo: IServerInfo;
  readonly #buildId = this.observe(atom(''));
  readonly #workspaceName = this.observe(atom(''));
  readonly #isClientOutdated = this.observe(atom(false));
  readonly #reloadApp: () => void;
  readonly #notificationService: INotificationService;
  readonly #notifications;
  readonly #reveal = this.observe(atom<IShellViewModel['reveal']>(null));
  #revealSeq = 0;
  readonly #activities;
  readonly #tree;
  readonly #activeLeafId;
  /**
   * 이 ViewModel 이 갖는 유일한 자기 상태다.
   *
   * 나머지는 전부 Model 에서 파생하지만, 드로어 개폐는 **모바일 전용 표현 상태**라 Model
   * (직렬화·지속의 대상)에 둘 것이 아니다. 그러면서도 컴포넌트에 맡길 수는 없다 — 파일을 열면
   * 닫아야 한다는 규칙을 아는 곳이 여기뿐이라서다.
   */
  readonly #isSidebarOpen = this.observe(atom(false));
  /** `requestCloseTab`이 확인을 구하는 동안 담아 두는 대상 — `confirmCloseTab`/`cancelCloseTab`이 지운다. */
  readonly #pendingTabClose = this.observe(atom<{ leafId: PaneId; tabId: string } | null>(null));
  /** 옛 `CommandCenterModel`에서 옮겨온 유일한 atom(2026-09-05) — `IShellViewModel.isPaletteOpen` 참고. */
  readonly #isPaletteOpen = this.observe(atom(false));
  readonly #theme;
  readonly #copyToClipboard: (text: string) => void;

  /** Model들을 받아 각각 구독한다 — 여기서 만든 atom이 화면 갱신의 유일한 통로다. */
  constructor({
    activityModel,
    tabsModel,
    themeModel,
    activityBarRegistry,
    tabDirtyState,
    startup,
    serverInfo,
    notificationService,
    commandCenterRegistry,
    copyToClipboard,
    reloadApp,
  }: {
    activityModel: IActivityModel;
    tabsModel: ITabsModel;
    themeModel: IThemeModel;
    activityBarRegistry: IActivityBarRegistry;
    tabDirtyState: ITabDirtyState;
    startup: IWorkbenchStartup;
    serverInfo: IServerInfo;
    notificationService: INotificationService;
    commandCenterRegistry: ICommandCenterRegistry;
    /** `no-restricted-globals`가 ViewModel의 `navigator` 직접 참조를 막는다 — 조립부(`registerServices.tsx`,
     *  대상 아님)가 이 얇은 함수를 주입한다(`DirectoryTreeViewModel`과 같은 패턴). */
    copyToClipboard: (text: string) => void;
    /** `location.reload()` — 같은 이유로 주입받는다. */
    reloadApp: () => void;
  }) {
    super();
    this.#activityModel = activityModel;
    this.#tabsModel = tabsModel;
    this.#themeModel = themeModel;
    this.#activityBar = activityBarRegistry;
    this.#tabDirtyState = tabDirtyState;
    this.#startup = startup;
    this.#serverInfo = serverInfo;
    this.#notificationService = notificationService;
    this.#copyToClipboard = copyToClipboard;
    this.#reloadApp = reloadApp;
    this.#notifications = this.observe(atom(this.#computeNotifications()));

    // Model은 값과 이벤트만 준다 — 파생된 화면 상태(atom)는 전부 여기서 소유한다.
    this.#activities = this.observe(atom(this.#computeActivities()));
    this.#tree = this.observe(atom(this.#computeTree()));
    this.#activeLeafId = this.observe(atom(tabsModel.activeLeafId));
    this.#theme = this.observe(atom(themeModel.theme));

    this.#subscriptions = [
      activityModel.onDidChange(() => this.#recompute()),
      tabsModel.onDidChange(() => this.#recompute()),
      themeModel.onDidChange(() => this.#recompute()),
      // dirty가 바뀌면 탭 표시가 달라진다 — 무엇이 더러워졌는지는 모르고 다시 계산만 한다.
      tabDirtyState.onDidChange(() => this.#recompute()),
      notificationService.onDidChange(() => this.#notifications.set(this.#computeNotifications())),
    ];

    this.#registerCommands(commandCenterRegistry);
  }

  /** `useViewModel`이 Shell 마운트에 자동으로 건다(`view-only-uses-view-model`) — Shell은 앱
   *  전체에서 한 번만 뜨는 루트라 이게 곧 "앱이 사는 동안"이다. */
  onMount(): void {
    this.#startup.start();
    void this.#serverInfo.load().then((info) => {
      this.#buildId.set(info === null ? '' : formatBuildLabel(info.builtAt, info.gitSha));
      this.#workspaceName.set(info?.workspaceName ?? '');
      // 버전과 **헤더 이름** 둘 다 본다. 이름이 바뀌면 서버는 우리 요청을 헤더 없음으로 읽어 426을
      // 주는데, 버전은 여전히 같아서 그것만 보면 낡은 줄 모른 채 빈 화면을 띄운다.
      const outdated = info !== null && (info.protocolVersion !== PROTOCOL_VERSION || info.protocolHeader !== PROTOCOL_HEADER);
      this.#isClientOutdated.set(outdated);
    });
  }

  /** `#startup.stop()`에 위임한다 — 무엇이 꺼지는지는 조립부만 안다. */
  onDispose(): void {
    this.#startup.stop();
  }

  /** `#activities`를 값으로 노출한다. */
  get activities(): readonly ShellActivityRow[] {
    return this.#activities.get();
  }

  /** `#tree`를 값으로 노출한다. */
  get tree(): ShellTabPaneNode {
    return this.#tree.get();
  }

  /** `#activeLeafId`를 값으로 노출한다. */
  get activeLeafId(): PaneId {
    return this.#activeLeafId.get();
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
    const tree = this.#tabsModel.tree;
    const leaf = this.#findLeaf(tree, leafId);
    // 없는 leaf·탭을 고르는 요청은 무시한다 — 활성 탭이 목록 밖을 가리키면 View 가 그릴 것을 잃는다.
    if (!leaf || !leaf.tabs.some((tab) => tab.id === tabId)) return;

    const nextTree = this.#replaceLeaf(tree, leafId, (l) => ({ ...l, activeTabId: tabId }));
    this.#commit(nextTree, leafId);
  }

  /** 탭을 닫고, 필요하면 이웃 탭으로 활성을 옮긴 뒤 트리를 정리해 반영한다. */
  closeTab(leafId: PaneId, tabId: string): void {
    const tree = this.#tabsModel.tree;
    const leaf = this.#findLeaf(tree, leafId);
    if (!leaf) return;
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;

    const remaining = leaf.tabs.filter((tab) => tab.id !== tabId);
    // 활성이 아닌 탭을 닫았다면 활성은 그대로다 — 보고 있던 것이 바뀌면 안 된다.
    const nextActiveTabId = leaf.activeTabId === tabId ? this.#neighbourOf(remaining, index) : leaf.activeTabId;
    const nextTree = this.#replaceLeaf(tree, leafId, (l) => ({ ...l, tabs: remaining, activeTabId: nextActiveTabId }));

    if (this.#tabsModel.previewTabId === tabId) this.#tabsModel.setPreviewTabId(null);
    // 닫은 leaf 가 이걸로 비어 사라질 수 있다(#commit 이 정리한다) — 그때는 포커스가 다른 pane 으로
    // 넘어가야 하니 "지금 활성 leaf"를 선호값으로 넘긴다(닫은 leaf 가 활성이 아니었으면 그대로 유지된다).
    this.#commit(nextTree, this.#tabsModel.activeLeafId);
  }

  /** `#pendingTabClose`를 값으로 노출한다. */
  get pendingTabClose(): { readonly leafId: PaneId; readonly tabId: string } | null {
    return this.#pendingTabClose.get();
  }

  /** `isDirty`가 거짓이면 바로 `closeTab`, 참이면 `#pendingTabClose`에 담아 확인을 기다린다. */
  requestCloseTab(leafId: PaneId, tabId: string): void {
    const isDirty = this.#tabDirtyState.isDirty(tabId);
    if (!isDirty) {
      this.closeTab(leafId, tabId);
      return;
    }
    this.#pendingTabClose.set({ leafId, tabId });
  }

  /** `#pendingTabClose`에 담긴 대상으로 `closeTab`을 호출한다. */
  confirmCloseTab(): void {
    const pending = this.#pendingTabClose.get();
    this.#pendingTabClose.set(null);
    if (pending === null) return;
    this.closeTab(pending.leafId, pending.tabId);
  }

  /** `#pendingTabClose`를 비운다. */
  cancelCloseTab(): void {
    this.#pendingTabClose.set(null);
  }

  /** `leafId`에서 `tabId`와 `protectedTabIds`를 뺀 나머지를 닫는다. */
  closeOtherTabs(leafId: PaneId, tabId: string, protectedTabIds: readonly string[] = []): void {
    const tree = this.#tabsModel.tree;
    const leaf = this.#findLeaf(tree, leafId);
    if (!leaf || !leaf.tabs.some((tab) => tab.id === tabId)) return;

    const kept = leaf.tabs.filter((tab) => tab.id === tabId || protectedTabIds.includes(tab.id));
    // 닫을 게 없다
    if (kept.length === leaf.tabs.length) return;
    this.#closeMany(leafId, leaf, kept, tabId);
  }

  /** `leafId`에서 `tabId`보다 뒤에 있는 탭 중 `protectedTabIds`를 뺀 나머지를 닫는다. */
  closeTabsToRight(leafId: PaneId, tabId: string, protectedTabIds: readonly string[] = []): void {
    const tree = this.#tabsModel.tree;
    const leaf = this.#findLeaf(tree, leafId);
    if (!leaf) return;
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;

    const closable = new Set(
      leaf.tabs.slice(index + 1).filter((tab) => !protectedTabIds.includes(tab.id)).map((tab) => tab.id),
    );
    if (closable.size === 0) return;
    const kept = leaf.tabs.filter((tab) => !closable.has(tab.id));
    this.#closeMany(leafId, leaf, kept, tabId);
  }

  /**
   * `closeOtherTabs`/`closeTabsToRight`가 공유하는 마무리 — 닫힌 탭 중 미리보기가 있었으면
   * 지우고, 활성 탭이 닫혔으면 `fallbackActiveTabId`(호출부가 이미 "남기기로 한" 탭)로 옮긴다.
   */
  #closeMany(leafId: PaneId, leaf: TabPaneLeaf, kept: readonly OpenTab[], fallbackActiveTabId: string): void {
    const closedIds = new Set(leaf.tabs.filter((tab) => !kept.includes(tab)).map((tab) => tab.id));
    const nextActiveTabId = leaf.activeTabId !== null && closedIds.has(leaf.activeTabId) ? fallbackActiveTabId : leaf.activeTabId;
    const tree = this.#tabsModel.tree;
    const nextTree = this.#replaceLeaf(tree, leafId, (l) => ({ ...l, tabs: kept, activeTabId: nextActiveTabId }));

    const preview = this.#tabsModel.previewTabId;
    if (preview !== null && closedIds.has(preview)) this.#tabsModel.setPreviewTabId(null);
    this.#commit(nextTree, this.#tabsModel.activeLeafId);
  }

  /** 개수가 안 맞으면(Model과 어긋나면) 무시하고, 맞으면 새 순서를 반영한다. */
  reorderTabs(leafId: PaneId, nextTabIds: readonly string[]): void {
    const tree = this.#tabsModel.tree;
    const leaf = this.#findLeaf(tree, leafId);
    if (!leaf) return;

    const byId = new Map(leaf.tabs.map((tab) => [tab.id, tab] as const));
    const reordered = nextTabIds.map((id) => byId.get(id)).filter((tab): tab is OpenTab => tab !== undefined);
    // 개수가 안 맞으면 View 가 들고 있던 탭 집합이 Model 과 어긋난 것이다 — 무시한다.
    if (reordered.length !== leaf.tabs.length) return;

    const nextTree = this.#replaceLeaf(tree, leafId, (l) => ({ ...l, tabs: reordered }));
    this.#tabsModel.setTree(nextTree);
  }

  /** 새 leaf를 만들어 분할하고, 새로 생긴 pane으로 포커스를 옮긴다. */
  splitTab(sourceLeafId: PaneId, tabId: string, position: SplitEdgeDropPosition): void {
    const tree = this.#tabsModel.tree;
    const sourceLeaf = this.#findLeaf(tree, sourceLeafId);
    if (!sourceLeaf) return;
    const movedTab = sourceLeaf.tabs.find((tab) => tab.id === tabId);
    if (!movedTab) return;

    const remaining = sourceLeaf.tabs.filter((tab) => tab.id !== tabId);
    const updatedSource: TabPaneLeaf = {
      kind: 'leaf',
      id: sourceLeaf.id,
      tabs: remaining,
      activeTabId: sourceLeaf.activeTabId === tabId ? (remaining[0]?.id ?? null) : sourceLeaf.activeTabId,
    };
    // 결정적인 id다(타임스탬프·난수 없음) — 같은 leaf에서 같은 탭을 분할하는 조작은 그 사이에
    // 이전 결과가 닫혀 있어야만 다시 일어날 수 있어 충돌하지 않는다.
    const newLeafId = `${sourceLeafId}-split-${tabId}`;
    const newLeaf: TabPaneLeaf = { kind: 'leaf', id: newLeafId, tabs: [movedTab], activeTabId: tabId };
    const orientation: TabSplitOrientation = position === 'left' || position === 'right' ? 'horizontal' : 'vertical';
    // position이 왼쪽/위면 새 leaf가 먼저 그려지는 자리, 오른쪽/아래면 나중 자리 — 드롭한 가장자리
    // 쪽에 새 패널이 생기는 게 자연스럽다.
    const children = position === 'left' || position === 'top' ? [newLeaf, updatedSource] : [updatedSource, newLeaf];
    const splitNode: TabPaneNode = { kind: 'split', id: `${sourceLeafId}-split-root`, orientation, children };

    const nextTree = this.#replaceLeaf(tree, sourceLeafId, () => splitNode);
    // 방금 떼어낸 탭이 있는 새 pane 으로 포커스를 옮긴다 — 드래그해서 분할했으면 그쪽을 보려던 것이다.
    this.#commit(nextTree, newLeafId);
  }

  /** `#tabsModel.setTree`로 리사이즈 결과를 반영한다. */
  resizeNode(branchId: PaneId, childId: PaneId, nextSize: number): void {
    const tree = this.#tabsModel.tree;
    this.#tabsModel.setTree(this.#resizeChild(tree, branchId, childId, nextSize));
  }

  /** 트리와 미리보기 탭의 경로를 전부 새 접두사로 옮긴다. */
  retargetTabs(oldPrefix: string, newPrefix: string): void {
    const retarget = (id: string): string => {
      if (id === oldPrefix) return newPrefix;
      if (id.startsWith(`${oldPrefix}/`)) return `${newPrefix}${id.slice(oldPrefix.length)}`;
      return id;
    };

    const tree = this.#tabsModel.tree;
    const nextTree = this.#retargetTree(tree, retarget);
    // 바뀐 게 없으면 새 트리를 만들지 않는다 — nanostores 는 참조로 변경을 알리므로, 매번 새 트리를
    // 주면 관련 없는 구독자까지 다시 그린다.
    if (nextTree !== tree) this.#tabsModel.setTree(nextTree);

    const preview = this.#tabsModel.previewTabId;
    if (preview !== null) {
      const nextPreview = retarget(preview);
      if (nextPreview !== preview) this.#tabsModel.setPreviewTabId(nextPreview);
    }
  }

  /** `#isSidebarOpen`을 값으로 노출한다. */
  get isSidebarOpen(): boolean {
    return this.#isSidebarOpen.get();
  }

  /** `#isSidebarOpen`에 값을 반영한다. */
  setSidebarOpen(open: boolean): void {
    this.#isSidebarOpen.set(open);
  }

  /** `#isPaletteOpen`을 값으로 노출한다. */
  get isPaletteOpen(): boolean {
    return this.#isPaletteOpen.get();
  }

  /** `#isPaletteOpen`에 값을 반영한다. */
  setPaletteOpen(open: boolean): void {
    this.#isPaletteOpen.set(open);
  }

  /** `#theme`를 값으로 노출한다. */
  /** 화면 구석에 띄울 빌드 표시. 아직 못 읽었거나 실패했으면 빈 문자열이다. */
  get buildId(): string {
    return this.#buildId.get();
  }

  /** 아직 서버 정보를 못 읽었으면 빈 문자열이다. */
  get workspaceName(): string {
    return this.#workspaceName.get();
  }

  /** 서버 정보를 못 읽었으면 `false`다 — 모르면 낡았다고 말하지 않는다. */
  get isClientOutdated(): boolean {
    return this.#isClientOutdated.get();
  }

  /** 주입받은 함수를 부른다 — 테스트가 실제 새로고침 없이 확인할 수 있게. */
  reloadApp(): void {
    this.#reloadApp();
  }

  /** 화면이 그릴 최소 필드만 남긴 행이다 — `at`은 여기서 빠진다. */
  get notifications(): readonly ShellNotificationRow[] {
    return this.#notifications.get();
  }

  /** 없는 id면 조용히 넘어간다. */
  dismissNotification(id: string): void {
    this.#notificationService.dismiss(id);
  }

  #computeNotifications(): readonly ShellNotificationRow[] {
    return this.#notificationService.notifications.map(({ id, severity, message }) => ({ id, severity, message }));
  }

  /** `'light'` 또는 `'dark'`. View가 이 값을 문서에 칠한다. */
  get theme(): string {
    return this.#theme.get();
  }

  /** 현재 테마를 반전시켜 `#themeModel.setTheme`을 호출한다. */
  toggleTheme(): void {
    this.#themeModel.setTheme(this.#themeModel.theme === 'dark' ? 'light' : 'dark');
  }

  /** 고정 탭으로 연다. 이미 있으면 그 탭을 활성으로만 만든다 — 미리보기 자리와 무관하다. */
  openTab(tab: { readonly id: string; readonly kind: string; readonly title: string }): void {
    const tree = this.#tabsModel.tree;
    const activeLeafId = this.#tabsModel.activeLeafId;
    const leaf = this.#findLeaf(tree, activeLeafId);
    if (!leaf) return;
    const open: OpenTab = { id: tab.id, kind: tab.kind, title: tab.title };
    const already = leaf.tabs.some((existing) => existing.id === open.id);
    const nextTree = this.#replaceLeaf(tree, activeLeafId, (l) => ({
      ...l,
      tabs: already ? l.tabs : [...l.tabs, open],
      activeTabId: open.id,
    }));
    this.#tabsModel.setTree(nextTree);
  }

  /** 활성 leaf 기준이다. 열린 탭이 없으면 `null`. */
  get activeTab(): { readonly id: string; readonly kind: string } | null {
    const leaf = this.#findLeaf(this.#tabsModel.tree, this.#tabsModel.activeLeafId);
    const active = leaf?.tabs.find((tab) => tab.id === leaf.activeTabId);
    return active === undefined ? null : { id: active.id, kind: active.kind };
  }

  /** 위치 요청이 없으면 `null`. 같은 위치를 다시 요청해도 `seq`로 구분된다. */
  get reveal(): IShellViewModel['reveal'] {
    return this.#reveal.get();
  }

  /** 활성 leaf 기준으로 미리보기 탭을 열거나, 이미 열려 있으면 고정한다. `position`은 그 탭의 내용에 전달된다. */
  previewFile(path: string, position?: { readonly line: number; readonly column: number }): void {
    if (position !== undefined) {
      this.#revealSeq += 1;
      this.#reveal.set({ tabId: path, line: position.line, column: position.column, seq: this.#revealSeq });
    }
    const tab: OpenTab = { id: path, kind: 'file', title: this.#nameOf(path) };
    const tree = this.#tabsModel.tree;
    const activeLeafId = this.#tabsModel.activeLeafId;
    const leaf = this.#findLeaf(tree, activeLeafId);
    // activeLeafId 는 항상 존재하는 leaf 를 가리킨다(불변) — 방어적으로만 무시한다.
    if (!leaf) return;

    const already = leaf.tabs.some((open) => open.id === tab.id);
    let nextTree: TabPaneNode;

    if (already) {
      // 미리보기 자리에 있던 것을 다시 열었다 = 같은 것을 두 번 눌렀다 → 고정한다.
      if (this.#tabsModel.previewTabId === tab.id) this.#tabsModel.setPreviewTabId(null);
      nextTree = this.#replaceLeaf(tree, activeLeafId, (l) => ({ ...l, activeTabId: tab.id }));
    } else {
      const replaced = this.#tabsModel.previewTabId;
      // 미리보기는 **자리 하나**다 — 밀어내는 게 아니라 갈아끼운다. 옛 미리보기 탭이 지금 이
      // leaf 에 있으면 걷어내고 갈아끼운다. 다른 pane 에 있으면 거기까지 건드리지 않는다 — 안 보고
      // 있는 다른 pane 의 탭을 이 leaf 의 조작만으로 지우는 건 사용자가 예상 못 할 부작용이다.
      // (그 탭은 그냥 조용히 "고정"된 채로 남는다, isPreview 만 꺼진다.)
      nextTree = this.#replaceLeaf(tree, activeLeafId, (l) => ({
        ...l,
        tabs: [...l.tabs.filter((open) => open.id !== replaced), tab],
        activeTabId: tab.id,
      }));
      this.#tabsModel.setPreviewTabId(tab.id);
    }

    this.#tabsModel.setTree(nextTree);
    this.#isSidebarOpen.set(false);
  }

  /** 미리보기 탭이면 `previewTabId`를 비워 고정한다. */
  pinTab(tabId: string): void {
    // previewFile 의 "다시 열면 고정한다"와 같은 동작 — previewTabId 는 트리 전체에서 하나뿐인
    // 전역 자리라 leaf 를 몰라도 된다.
    if (this.#tabsModel.previewTabId === tabId) this.#tabsModel.setPreviewTabId(null);
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
  #registerCommands(commandCenterRegistry: ICommandCenterRegistry): void {
    /**
     * 증명용 커맨드 — Command·Keybinding 배선이 실제로 동작하는지 보는 첫 사례로 남겨둔 것.
     * 테마 전환은 이미 `toggleTheme()`으로도 되지만, 커맨드로도 하나 등록해둔다(둘이 공존해도
     * 문제없다 — 커맨드는 그냥 또 다른 트리거일 뿐이다).
     */
    commandCenterRegistry.registerCommand({
      id: 'shell.toggleTheme',
      label: '테마 전환',
      execute: () => this.toggleTheme(),
    });
    commandCenterRegistry.registerKeybinding({ id: 'shell.toggleTheme.keybinding', keybinding: 'ctrl+j', actionId: 'shell.toggleTheme' });

    /**
     * 팔레트를 여는 것 자체가 커맨드다 — VSCode의 `workbench.action.showCommands`와 같은 방식.
     * `execute`가 `setPaletteOpen`을 부르는 것 말고는 하는 일이 없다 — 옛
     * `commandCenterModel.setPaletteOpen`(2026-09-05, `ICommandCenterRegistry`로 분해되며
     * `IShellViewModel`로 옮겨왔다).
     */
    commandCenterRegistry.registerCommand({
      id: 'shell.openCommandPalette',
      label: '커맨드 팔레트 열기',
      execute: () => this.setPaletteOpen(true),
    });
    commandCenterRegistry.registerKeybinding({ id: 'shell.openCommandPalette.keybinding', keybinding: 'ctrl+k', actionId: 'shell.openCommandPalette' });

    // 활동마다 `<title> 보기` — VSCode의 `workbench.view.explorer`(Ctrl+Shift+E) 같은 것. 단축키는
    // 활동을 등록한 쪽이 descriptor에 적는다.
    for (const activity of this.#activityBar.list()) {
      const commandId = `shell.showActivity.${activity.id}`;
      commandCenterRegistry.registerCommand({ id: commandId, label: `${activity.title} 보기`, execute: () => this.showActivity(activity.id) });
      if (activity.keybinding !== undefined) {
        commandCenterRegistry.registerKeybinding({ id: `${commandId}.keybinding`, keybinding: activity.keybinding, actionId: commandId });
      }
    }

    commandCenterRegistry.registerCommand({
      id: 'shell.openSettings',
      label: '설정 열기',
      execute: () => this.openTab({ id: 'settings', kind: 'settings', title: '설정' }),
    });
    commandCenterRegistry.registerKeybinding({ id: 'shell.openSettings.keybinding', keybinding: 'ctrl+,', actionId: 'shell.openSettings' });

    commandCenterRegistry.registerCommand({
      id: 'shell.openKeybindings',
      label: '키보드 단축키 보기',
      execute: () => this.openTab({ id: 'keybindings', kind: 'keybindings', title: '키보드 단축키' }),
    });

    const isTabContextTarget = (value: unknown): value is TabContextTarget =>
      typeof value === 'object' && value !== null && 'leafId' in value && 'tabId' in value;

    const findLeafTabs = (node: ShellTabPaneNode, leafId: PaneId): readonly ShellTabRow[] | undefined => {
      if (node.kind === 'leaf') return node.id === leafId ? node.tabs : undefined;
      for (const child of node.children) {
        const found = findLeafTabs(child, leafId);
        if (found !== undefined) return found;
      }
      return undefined;
    };

    const findActiveTabId = (node: ShellTabPaneNode, leafId: PaneId): string | null => {
      if (node.kind === 'leaf') return node.id === leafId ? node.activeTabId : null;
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
      commandCenterRegistry.registerCommand({
        id,
        label,
        execute: (context) => {
          const target = targetOf(context);
          if (target === null) return;
          this.splitTab(target.leafId, target.tabId, position);
        },
      });
    };
    registerSplit('shell.tab.splitLeft', '탭: 왼쪽으로 분할', 'left');
    registerSplit('shell.tab.splitRight', '탭: 오른쪽으로 분할', 'right');
    registerSplit('shell.tab.splitTop', '탭: 위로 분할', 'top');
    registerSplit('shell.tab.splitBottom', '탭: 아래로 분할', 'bottom');

    commandCenterRegistry.registerCommand({
      id: 'shell.tab.close',
      label: '탭: 닫기',
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.requestCloseTab(target.leafId, target.tabId);
      },
    });

    commandCenterRegistry.registerCommand({
      id: 'shell.tab.closeOthers',
      label: '탭: 다른 탭 모두 닫기',
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.closeOtherTabs(target.leafId, target.tabId, dirtyTabIdsIn(target.leafId));
      },
    });

    commandCenterRegistry.registerCommand({
      id: 'shell.tab.closeToRight',
      label: '탭: 오른쪽 탭 모두 닫기',
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.closeTabsToRight(target.leafId, target.tabId, dirtyTabIdsIn(target.leafId));
      },
    });

    commandCenterRegistry.registerCommand({
      id: 'shell.tab.copyPath',
      label: '탭: 경로 복사',
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
     * `ContextMenu.Content` 안이라 `CommandContextMenu`가 감싸는 `Trigger`가 중복된다). `group`은
     * VSCode 관례 — `1_split`이 분할, `2_close`가 닫기 계열, `3_copy`가 복사.
     */
    commandCenterRegistry.registerMenuItem({ id: 'shell.tab.context.splitLeft', menuId: 'shell.tab.context', commandId: 'shell.tab.splitLeft', group: '1_split', order: 0 });
    commandCenterRegistry.registerMenuItem({ id: 'shell.tab.context.splitRight', menuId: 'shell.tab.context', commandId: 'shell.tab.splitRight', group: '1_split', order: 1 });
    commandCenterRegistry.registerMenuItem({ id: 'shell.tab.context.splitTop', menuId: 'shell.tab.context', commandId: 'shell.tab.splitTop', group: '1_split', order: 2 });
    commandCenterRegistry.registerMenuItem({ id: 'shell.tab.context.splitBottom', menuId: 'shell.tab.context', commandId: 'shell.tab.splitBottom', group: '1_split', order: 3 });
    commandCenterRegistry.registerMenuItem({ id: 'shell.tab.context.close', menuId: 'shell.tab.context', commandId: 'shell.tab.close', group: '2_close', order: 0 });
    commandCenterRegistry.registerMenuItem({ id: 'shell.tab.context.closeOthers', menuId: 'shell.tab.context', commandId: 'shell.tab.closeOthers', group: '2_close', order: 1 });
    commandCenterRegistry.registerMenuItem({ id: 'shell.tab.context.closeToRight', menuId: 'shell.tab.context', commandId: 'shell.tab.closeToRight', group: '2_close', order: 2 });
    commandCenterRegistry.registerMenuItem({ id: 'shell.tab.context.copyPath', menuId: 'shell.tab.context', commandId: 'shell.tab.copyPath', group: '3_copy', order: 0 });
  }

  /** Model 의 트리를 화면용 트리로 바꾼다 — leaf 의 탭마다 `isPreview`·`isDirty` 를 파생시킨다. */
  #toShellTree(node: TabPaneNode, previewId: string | null): ShellTabPaneNode {
    if (node.kind === 'leaf') {
      return {
        kind: 'leaf',
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
      kind: 'split',
      id: node.id,
      orientation: node.orientation,
      children: node.children.map((child) => this.#toShellTree(child, previewId)),
      size: node.size,
    };
  }

  /** 트리 어디든 재귀로 내려가 `leafId`를 찾아 갱신한다 — leaf 를 다른 노드(예: split)로 바꿀 수도 있다(분할). */
  #replaceLeaf(node: TabPaneNode, leafId: PaneId, replace: (leaf: TabPaneLeaf) => TabPaneNode): TabPaneNode {
    if (node.kind === 'leaf') return node.id === leafId ? replace(node) : node;
    return { ...node, children: node.children.map((child) => this.#replaceLeaf(child, leafId, replace)) };
  }

  #findLeaf(node: TabPaneNode, leafId: PaneId): TabPaneLeaf | null {
    if (node.kind === 'leaf') return node.id === leafId ? node : null;
    for (const child of node.children) {
      const found = this.#findLeaf(child, leafId);
      if (found) return found;
    }
    return null;
  }

  #firstLeafId(node: TabPaneNode): PaneId {
    if (node.kind === 'leaf') return node.id;
    const [first] = node.children;
    return first ? this.#firstLeafId(first) : ROOT_PANE_ID;
  }

  /** 빈 leaf를 걷어내고, 자식이 하나만 남은 split은 그 자식으로 대체한다. 전부 사라지면 `null`. */
  #pruneTree(node: TabPaneNode): TabPaneNode | null {
    if (node.kind === 'leaf') return node.tabs.length > 0 ? node : null;
    const survivors = node.children.map((child) => this.#pruneTree(child)).filter((child): child is TabPaneNode => child !== null);
    const [only, second] = survivors;
    if (!only) return null;
    return second ? { ...node, children: survivors } : { ...only, size: node.size };
  }

  #resizeChild(node: TabPaneNode, branchId: PaneId, childId: PaneId, nextSize: number): TabPaneNode {
    if (node.kind === 'leaf') return node;
    if (node.id === branchId) {
      return { ...node, children: node.children.map((child) => (child.id === childId ? { ...child, size: nextSize } : child)) };
    }
    return { ...node, children: node.children.map((child) => this.#resizeChild(child, branchId, childId, nextSize)) };
  }

  #retargetTree(node: TabPaneNode, retarget: (id: string) => string): TabPaneNode {
    if (node.kind === 'leaf') {
      const tabs = node.tabs.map((tab) => {
        const id = retarget(tab.id);
        return id === tab.id ? tab : { ...tab, id, title: this.#nameOf(id) };
      });
      const activeTabId = node.activeTabId === null ? null : retarget(node.activeTabId);
      const changed = activeTabId !== node.activeTabId || tabs.some((tab, index) => tab !== node.tabs[index]);
      return changed ? { ...node, tabs, activeTabId } : node;
    }
    const children = node.children.map((child) => this.#retargetTree(child, retarget));
    return children.some((child, index) => child !== node.children[index]) ? { ...node, children } : node;
  }

  /** 트리를 정리(빈 leaf 걷어내기)해 반영하고, 선호하는 leaf 가 살아남았으면 그리로, 아니면 첫 leaf 로 포커스를 맞춘다. */
  #commit(tree: TabPaneNode, preferredActiveLeafId: PaneId): void {
    const pruned = this.#pruneTree(tree) ?? ShellViewModel.#EMPTY_ROOT;
    this.#tabsModel.setTree(pruned);
    const activeLeafId = this.#findLeaf(pruned, preferredActiveLeafId) ? preferredActiveLeafId : this.#firstLeafId(pruned);
    this.#tabsModel.setActiveLeafId(activeLeafId);
  }

  /**
   * 탭을 닫을 때 어느 이웃을 활성화할 것인가 — **오른쪽 먼저, 없으면 왼쪽**이다.
   *
   * 브라우저·에디터가 전부 이 규칙을 쓰고, 사람이 탭을 연달아 닫을 때 손이 한 자리에 머문다.
   * 왼쪽을 먼저 고르면 닫을 때마다 활성 탭이 뒤로 밀려 순서가 뒤집힌 것처럼 느껴진다.
   */
  #neighbourOf(tabs: readonly OpenTab[], closedIndex: number): string | null {
    return tabs[closedIndex]?.id ?? tabs[closedIndex - 1]?.id ?? null;
  }

  /** 경로의 마지막 조각. 폰의 탭 스트립에는 경로 전체가 들어가지 않는다. */
  #nameOf(path: string): string {
    return path.split('/').pop() ?? path;
  }

  #isActivityId(id: string): boolean {
    return this.#activityBar.tryGet(id) !== undefined;
  }

  /** 구독을 끊는다. 컨테이너가 이 VM을 정리할 때 불린다. */
  dispose(): void {
    for (const subscription of this.#subscriptions) subscription.dispose();
  }

  #recompute(): void {
    this.#activities.set(this.#computeActivities());
    this.#tree.set(this.#computeTree());
    this.#activeLeafId.set(this.#tabsModel.activeLeafId);
    this.#theme.set(this.#themeModel.theme);
  }

  #computeActivities() {
    const activeId = this.#activityModel.activeActivityId;
    return this.#activityBar
      .list()
      .map((entry) => ({ id: entry.id, title: entry.title, iconId: entry.iconId, isActive: entry.id === activeId }));
  }

  #computeTree() {
    return this.#toShellTree(this.#tabsModel.tree, this.#tabsModel.previewTabId);
  }

}
