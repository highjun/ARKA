import { ContainerProvider, useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
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
import type { ICommandService } from "#core/commands";
import type { TabContentProps, TabDescriptor } from "../model/ITabProviderDescriptor";
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

type ShellTabDisplayRow = ShellTabRow & { readonly descriptor: TabDescriptor | undefined };
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
 * `IShellViewModel.tree` 에는 없는 `TabDescriptor`(아이콘·본문)를 이 트리 전체에 병합한다 — React 값이라
 * ViewModel 이 들지 않는다. 순수 함수라 훅이 아니다 — 렌더 본문에서 그냥 부른다.
 */
const mergeTabDisplay = (
  node: ShellTabPaneNode,
  descriptorOf: (tabId: string) => TabDescriptor | undefined,
): ShellTabDisplayNode => {
  if (node.kind === "leaf") {
    return { ...node, tabs: node.tabs.map((tab) => ({ ...tab, descriptor: descriptorOf(tab.id) })) };
  }
  return { ...node, children: node.children.map((child) => mergeTabDisplay(child, descriptorOf)) };
};

/** ViewModel 의 트리를 `Tab`이 요구하는 트리로 바꾼다 — 탭마다 `content`를 여기서
 *  처음이자 마지막으로 채워 넣는다(Model·ViewModel 은 `ReactNode`를 갖지 않는다는 원칙).
 *  `iconId`는 `Tab`이 아직 요구하는 자리라 채울 뿐이고, 실제 아이콘은 descriptor의 `icon`이다. */
const buildTree = (node: ShellTabDisplayNode, renderTab: (tab: ShellTabDisplayRow) => ReactNode): TabTreeNode => {
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
        iconId: "file" as IconId,
        icon: tab.descriptor === undefined ? undefined : () => tab.descriptor?.icon,
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
/**
 * 탭 우클릭 메뉴 — `shell.tab.context`에 담긴 명령들을 `Tab.renderTabContextMenu` 자리에 항목으로 그린다.
 * 우클릭한 탭이 `context`로 명령에 전달된다.
 */
const buildTabContextMenu = (tree: TabTreeNode, commands: ICommandService) => (tab: TabItem) => {
  const leafId = findLeafIdForTab(tree, tab.id);
  if (!leafId) return null;
  const context: TabContextTarget = { leafId, tabId: tab.id };

  const items = commands
    .matchMenuItems("shell.tab.context")
    .map((menuItem) => {
      const action = commands.actions.tryGet(menuItem.actionId);
      return action === undefined ? null : { actionId: menuItem.actionId, label: action.label };
    })
    .filter((item) => item !== null);

  return (
    <>
      {items.map((item) => (
        <Menu.Item key={item.actionId} onSelect={() => commands.execute(item.actionId, context)}>
          {item.label}
        </Menu.Item>
      ))}
    </>
  );
};

/**
 * 다른 모듈을 Shell 에 잇는 **유일한 자리** — `sidebarContentRegistry`를 조회해서 그리고, 탭은 ViewModel이
 * 준 `TabDescriptor`로 그린다. 어떤 모듈이 무엇을 등록했는지는 `registerServices.tsx`만 안다.
 *
 * **파일을 모른다.** 탭의 dirty 여부는 그 탭의 descriptor가 말하고, 셸은 그것을 트리에 담아 그릴 뿐이다.
 * 탭 본문은 그 탭의 자식 컨테이너로 감싼다 — 탭 안에서 `useViewModel`이 꺼내는 것은 거기서 온다.
 */
export const ShellView = observer(function ShellView() {
  const viewModel = useViewModel("arka.workbench.shellViewModel");
  const sidebarContentRegistry = useViewModel("arka.workbench.sidebarContentRegistry");
  const commandCenterRegistry = useViewModel("arka.commands");

  /** 저장 안 된 탭을 닫으려 하면 확인을 구한다 — dirty 여부는 ViewModel이 descriptor에 묻는다. */
  const onTabClose = (leafId: string, tabId: string) => {
    viewModel.requestCloseTab(leafId, tabId);
  };

  /** descriptor가 아직 없는 탭(복원 중)은 빈 채로 둔다 — 붙는 순간 ViewModel이 다시 계산한다. */
  const renderTab = (tab: ShellTabDisplayRow): ReactNode => {
    const descriptor = tab.descriptor;
    if (descriptor === undefined) return null;
    const contentProps: TabContentProps = { tabId: tab.id };
    return (
      <ContainerProvider container={viewModel.containerOf(tab.id)}>
        <descriptor.Content {...contentProps} />
      </ContainerProvider>
    );
  };

  // 확장이 내는 본문·액션은 커널에게서 아무것도 받지 않는다 — 파일을 여는 것도 명령이다.
  const renderSlot = (Slot: ComponentType | undefined): ReactNode => (Slot === undefined ? null : <Slot />);

  const treeWithDirty = mergeTabDisplay(viewModel.tree, (tabId) => viewModel.descriptorOf(tabId));
  const activeActivity = viewModel.activities.find((activity) => activity.isActive);
  const activeActivityId = activeActivity?.id ?? null;
  const sidebar = activeActivityId === null ? undefined : sidebarContentRegistry.tryGet(activeActivityId);
  const panelContent = renderSlot(sidebar?.ContentComponent);
  const uiTree = buildTree(treeWithDirty, renderTab);

  // 팔레트 목록은 커맨드 registry를 그대로 옮긴 것이다 — 등록은 부팅 시 한 번 끝나므로 매 렌더
  // 다시 계산해도 가볍다.
  const shortcutOf = (actionId: string): readonly string[] | undefined => {
    // 사용자 재정의가 있으면 그것이 실효 키다. `null`은 꺼 둔 것이라 안 보인다.
    const effective = commandCenterRegistry.overrides.has(actionId)
      ? commandCenterRegistry.overrides.get(actionId)
      : commandCenterRegistry.keybindings.list().find((entry) => entry.actionId === actionId)?.keybinding;
    return effective?.split("+").map((key) => key.charAt(0).toUpperCase() + key.slice(1));
  };
  const commandItems = commandCenterRegistry.actions
    .list()
    .map((action) => ({ id: action.id, label: action.label, shortcut: shortcutOf(action.id) }));
  const onCommandSelect = (id: string) => {
    commandCenterRegistry.execute(id);
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
        panelTitle={sidebar === undefined ? undefined : activeActivity?.title}
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
});
