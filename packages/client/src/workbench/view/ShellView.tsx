import { CommandCenterRegistryToken } from "#core/commands";
import { SidebarContentRegistryToken } from "../model/ISidebarContentRegistry";
import type { SidebarSlotProps } from "../model/ISidebarContentRegistry";
import { TabContentRegistryToken } from "../model/ITabContentRegistry";
import { ShellViewModelToken } from "../viewmodel/IShellViewModel";
import { matchMenuItems } from "#core/menu";
import { useViewModel } from "#core/viewmodel";
import { Banner, ConfirmationDialog } from "@primer/react";
import { Menu } from "#component/Menu";
import { Icon } from "#component/Icon";
import { ModeToggle } from "#component/ModeToggle";
import { Text } from "#component/Text";
import { CommandPalette } from "../component/CommandPalette";
import { NotificationList } from "../component/NotificationList";
import { Shell } from "../component/Shell";
import { Tab } from "../component/Tab";
import type { IconId } from "#component/Icon";
import type { TabItem, TabTreeNode } from "../component/Tab";
import type { ComponentType, ReactNode } from "react";
import type { ICommandCenterRegistry } from "#core/commands";
import type { ITabContentRegistry } from "../model/ITabContentRegistry";
import type { ShellTabPaneNode, ShellTabRow, TabContextTarget } from "../viewmodel/IShellViewModel";
import styles from "./ShellView.module.css";

/**
 * DI·구독·마크업이 한 파일에 있다(2026-09-04, D9) — `useViewModel` 하나만 부른다는 규율
 * (`view-only-uses-view-model`)로 "DI를 아는 파일을 하나로 가둔다"를 지킨다. `useCallback`도
 * 이 파일에 없다 — 메모이즈해서 감싸던 핸들러는 전부 로직이 없는 순수 배선이거나(그대로 인라인),
 * 로직이면 ViewModel로 옮겼다.
 *
 * 전역 배선(키다운 디스패치·beforeunload 가드·빌드ID 조회·테마 DOM 반영)은 여기 없다 — Shell
 * 자신의 도메인 로직이 아니라 앱 전체 단위 배선이라 `src/workbench/Workbench.tsx`(View 규율 밖)로 옮겼다.
 *
 * 탭 닫기 확인은 `window.confirm` 대신 `IShellViewModel.pendingTabClose` + 기존 `Dialog`다
 * (2026-09-04 — 네이티브 대화상자는 앱 UI와 다르게 생겨 일관성이 없다는 판단).
 */
const DOES_NOTHING_YET = () => {};

type ShellTabDisplayRow = ShellTabRow & { readonly iconId: string };
type ShellTabDisplayNode =
  | {
      readonly kind: "leaf";
      readonly id: string;
      readonly tabs: readonly ShellTabDisplayRow[];
      readonly activeTabId: string | null;
      readonly size?: number;
    }
  | {
      readonly kind: "split";
      readonly id: string;
      readonly orientation: "horizontal" | "vertical";
      readonly children: readonly ShellTabDisplayNode[];
      readonly size?: number;
    };

/**
 * `IShellViewModel.tree` 에는 없는 `iconId` 를 이 트리 전체에 병합한다 — 탭마다 registry 조회가
 * 필요해 ViewModel 이 모른다. 순수 함수라 훅이 아니다 — 렌더 본문에서 그냥 부른다.
 */
const mergeTabDisplay = (node: ShellTabPaneNode, tabContentRegistry: ITabContentRegistry): ShellTabDisplayNode => {
  if (node.kind === "leaf") {
    return {
      ...node,
      tabs: node.tabs.map((tab) => ({
        ...tab,
        iconId: tabContentRegistry.tryGet(tab.kind)?.iconId ?? "file",
      })),
    };
  }
  return { ...node, children: node.children.map((child) => mergeTabDisplay(child, tabContentRegistry)) };
};

/** ViewModel 의 트리를 `Tab`이 요구하는 트리로 바꾼다 — 탭마다 `content`를 여기서
 *  처음이자 마지막으로 채워 넣는다(Model·ViewModel 은 `ReactNode`를 갖지 않는다는 원칙). */
const buildTree = (node: ShellTabDisplayNode, renderTab: (tab: ShellTabRow) => ReactNode): TabTreeNode => {
  if (node.kind === "leaf") {
    return {
      kind: "leaf",
      id: node.id,
      activeTab: node.activeTabId ?? "",
      tabItems: node.tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        isPreview: tab.isPreview,
        isDirty: tab.isDirty,
        iconId: tab.iconId as IconId,
        content: renderTab(tab),
      })),
      size: node.size,
    };
  }
  return {
    kind: "split",
    id: node.id,
    orientation: node.orientation,
    children: node.children.map((child) => buildTree(child, renderTab)),
    size: node.size,
  };
};

/** 우클릭 메뉴엔 `tab`만 넘어오고 어느 pane 소속인지는 안 딸려온다 — 그래서 트리를 훑어 역으로 찾는다. */
const findLeafIdForTab = (node: TabTreeNode, tabId: string): string | null => {
  if (node.kind === "leaf") return node.tabItems.some((item) => item.id === tabId) ? node.id : null;
  for (const child of node.children) {
    const found = findLeafIdForTab(child, tabId);
    if (found) return found;
  }
  return null;
};

/**
 * 탭 우클릭 메뉴를 `menuId: 'shell.tab.context'`(`shellCommands.ts`가 등록) 조회로 그린다 —
 * `CommandContextMenu`를 그대로 못 쓰는 이유는, 그건 자기 `Menu.Trigger`
 * 를 새로 감싸는데 `Tab.tsx`가 `renderTabContextMenu`를 이미 `Menu.Content` 안에서 부르기
 * 때문이다 — 여기선 항목(`Menu.Item`)만 돌려준다.
 */
const buildTabContextMenu = (tree: TabTreeNode, commandCenterRegistry: ICommandCenterRegistry) => (tab: TabItem) => {
  const leafId = findLeafIdForTab(tree, tab.id);
  if (!leafId) return null;
  const context: TabContextTarget = { leafId, tabId: tab.id };

  const items = matchMenuItems(
    commandCenterRegistry.menuRegistry,
    commandCenterRegistry.contextRegistry,
    "shell.tab.context",
  )
    .map((menuItem) => {
      const command = commandCenterRegistry.commandRegistry.tryGet(menuItem.commandId);
      return command === undefined ? null : { id: menuItem.id, label: command.label, commandId: menuItem.commandId };
    })
    .filter((item) => item !== null);

  return (
    <>
      {items.map((item) => (
        <Menu.Item
          key={item.id}
          onSelect={() => commandCenterRegistry.commandRegistry.tryGet(item.commandId)?.execute(context)}
        >
          {item.label}
        </Menu.Item>
      ))}
    </>
  );
};

/**
 * 다른 모듈을 Shell 에 잇는 **유일한 자리** — `sidebarContentRegistry`·`tabContentRegistry`를
 * 조회해서 그릴 뿐이다. 어떤 모듈이 무엇을 등록했는지는 `registerServices.tsx`만 안다.
 *
 * **파일을 모른다.** 탭의 dirty 여부는 ViewModel이 `ITabDirtyState`에 물어 트리에 담아 주고,
 * 무엇이 그 답을 채우는지는 조립부(`registerServices`)만 안다.
 */
export const ShellView = () => {
  const viewModel = useViewModel(ShellViewModelToken);
  const sidebarContentRegistry = useViewModel(SidebarContentRegistryToken);
  const tabContentRegistry = useViewModel(TabContentRegistryToken);
  const commandCenterRegistry = useViewModel(CommandCenterRegistryToken);

  const onFileOpen = (path: string, position?: { readonly line: number; readonly column: number }) =>
    viewModel.previewFile(path, position);
  const onFilePin = (path: string) => viewModel.pinTab(path);
  /** 탭이 가리키는 경로만 옮긴다 — 편집 버퍼는 그것을 소유한 쪽이 스스로 옮긴다. */
  const onFileMove = (oldPath: string, newPath: string) => viewModel.retargetTabs(oldPath, newPath);
  const onOpenTab = (tab: { readonly id: string; readonly kind: string; readonly title: string }) =>
    viewModel.openTab(tab);

  /** 저장 안 된 탭을 닫으려 하면 확인을 구한다 — dirty 여부는 ViewModel이 `ITabDirtyState`에 묻는다. */
  const onTabClose = (leafId: string, tabId: string) => {
    viewModel.requestCloseTab(leafId, tabId);
  };

  const renderTab = (tab: ShellTabRow): ReactNode => {
    const TabComponent = tabContentRegistry.tryGet(tab.kind)?.TabComponent;
    const reveal = viewModel.reveal !== null && viewModel.reveal.tabId === tab.id ? viewModel.reveal : null;
    return TabComponent ? <TabComponent tabId={tab.id} reveal={reveal} /> : null;
  };

  // 확장이 내는 본문·액션은 모두 같은 통로를 받는다 — 커널이 크롬을 그리므로 제목은 값으로 온다.
  const slotProps = { onFileOpen, onFileMove, onFilePin, onOpenTab };
  const renderSlot = (Slot: ComponentType<SidebarSlotProps> | undefined): ReactNode =>
    Slot === undefined ? null : <Slot {...slotProps} />;

  const treeWithDirty = mergeTabDisplay(viewModel.tree, tabContentRegistry);
  const activeActivityId = viewModel.activities.find((activity) => activity.isActive)?.id ?? null;
  const sidebar = activeActivityId === null ? undefined : sidebarContentRegistry.tryGet(activeActivityId);
  const panelContent = renderSlot(sidebar?.ContentComponent);
  const uiTree = buildTree(treeWithDirty, renderTab);

  // 팔레트 목록은 커맨드 registry를 그대로 옮긴 것이다 — 등록은 부팅 시 한 번 끝나므로 매 렌더
  // 다시 계산해도 가볍다.
  const shortcutOf = (commandId: string): readonly string[] | undefined => {
    const binding = commandCenterRegistry.keybindingRegistry.list().find((entry) => entry.actionId === commandId);
    return binding?.keybinding.split("+").map((key) => key.charAt(0).toUpperCase() + key.slice(1));
  };
  const commandItems = commandCenterRegistry.commandRegistry
    .list()
    .map((command) => ({ id: command.id, label: command.label, shortcut: shortcutOf(command.id) }));
  const onCommandSelect = (id: string) => {
    commandCenterRegistry.commandRegistry.tryGet(id)?.execute(undefined);
    viewModel.setPaletteOpen(false);
  };

  const pendingTabClose = viewModel.pendingTabClose;

  return (
    <>
      {/* 닫을 수 없다 — 낡은 채로 쓰면 요청이 426으로 죽는다. `role="status"`로 랜드마크 대신
          라이브 영역을 만든다: 이 띠는 처음부터 있는 것이 아니라 프로토콜이 어긋난 순간 나타나므로
          나타났다는 사실이 읽혀야 한다. `flush`는 화면 맨 위에 모서리 없이 붙이려는 것이다. */}
      {viewModel.isClientOutdated ? (
        <Banner
          role="status"
          variant="warning"
          layout="compact"
          flush
          title="새 버전이 있다"
          description="이 화면은 서버와 다른 프로토콜을 쓰고 있다."
          primaryAction={
            <Banner.PrimaryAction onClick={() => viewModel.reloadApp()}>다시 불러오기</Banner.PrimaryAction>
          }
        />
      ) : null}
      <Shell
        colorMode={viewModel.theme as "light" | "dark"}
        overlays={
          <CommandPalette
            open={viewModel.isPaletteOpen}
            onOpenChange={(open) => viewModel.setPaletteOpen(open)}
            items={commandItems}
            onSelect={onCommandSelect}
          />
        }
        brand={
          <span className={styles["brandGroup"]}>
            <img src="/arka-mark.svg" alt="" width={20} height={20} />
            <span className={styles["brandText"]}>
              {viewModel.workspaceName === "" ? "ARKA" : viewModel.workspaceName}
            </span>
          </span>
        }
        actions={
          <span className={styles["trailingGroup"]}>
            <Text size="small" tone="muted" className={styles["buildId"]}>
              {viewModel.buildId}
            </Text>
            <ModeToggle
              values={["light", "dark"]}
              value={viewModel.theme}
              labels={["어둡게 전환", "밝게 전환"]}
              onValueChange={() => viewModel.toggleTheme()}
            >
              {[<Icon key="sun" iconId="sun" size="sm" />, <Icon key="moon" iconId="moon" size="sm" />]}
            </ModeToggle>
          </span>
        }
        activityItems={viewModel.activities.map((activity) => ({
          id: activity.id,
          iconId: activity.iconId as IconId,
          label: activity.title,
          isActive: activity.isActive,
        }))}
        onActivitySelect={(id) => viewModel.selectActivity(id)}
        panelContent={panelContent}
        panelInlineActions={renderSlot(sidebar?.InlineActions)}
        panelActions={renderSlot(sidebar?.MenuActions)}
        sidebarOpen={viewModel.isSidebarOpen}
        onSidebarOpenChange={(open) => viewModel.setSidebarOpen(open)}
        sidebarAriaLabel="사이드바"
        sidebarResizable
        sidebarWidthStorageKey="arka-workbench:sidebar-width"
      >
        <Tab
          className={styles["tab"]}
          chrome="none"
          tree={uiTree}
          activeLeaf={viewModel.activeLeafId}
          onTabClick={(leafId, tabId) => viewModel.selectTab(leafId, tabId)}
          onTabClose={onTabClose}
          onTabReorder={(leafId, nextItems) =>
            viewModel.reorderTabs(
              leafId,
              nextItems.map((item) => item.id),
            )
          }
          onTabPin={(_leafId, tabId) => viewModel.pinTab(tabId)}
          onTabSplit={(sourceLeafId, tabId, position) => viewModel.splitTab(sourceLeafId, tabId, position)}
          onNodeResize={(branchId, childId, nextSize) => viewModel.resizeNode(branchId, childId, nextSize)}
          renderTabContextMenu={buildTabContextMenu(uiTree, commandCenterRegistry)}
          onMenuClick={DOES_NOTHING_YET}
          stripEmptyLabel={null}
          emptyMessage={
            <Text size="small" tone="muted">
              탐색기에서 파일을 고르세요.
            </Text>
          }
        />
      </Shell>

      <NotificationList items={viewModel.notifications} onDismiss={(id) => viewModel.dismissNotification(id)} />

      {pendingTabClose === null ? null : (
        <ConfirmationDialog
          title="저장하지 않은 변경사항이 있다"
          confirmButtonContent="닫기"
          cancelButtonContent="취소"
          confirmButtonType="danger"
          onClose={(gesture) => (gesture === "confirm" ? viewModel.confirmCloseTab() : viewModel.cancelCloseTab())}
        >
          닫으면 사라진다 — 그래도 닫을까?
        </ConfirmationDialog>
      )}
    </>
  );
};
