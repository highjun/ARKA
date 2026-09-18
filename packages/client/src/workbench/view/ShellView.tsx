import { ContainerProvider, useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Banner, ConfirmationDialog } from "@primer/react";
import { Menu } from "#component/Menu";
import { Icon } from "#component/Icon";
import type { IconId } from "#component/Icon";
import { ModeToggle } from "#component/ModeToggle";
import { Text } from "#component/Text";
import { CommandPalette } from "../component/CommandPalette";
import { NotificationList } from "../component/NotificationList";
import { Shell } from "../component/Shell";
import { Tab } from "../component/Tab";
import type { PaneRowNode, TabRow } from "../component/Tab";
import type { ComponentType, ReactNode } from "react";
import type { ICommandService } from "#core/commands";
import type { TabContentProps, TabDescriptor } from "../model/ITabProviderDescriptor";
import type { ShellTabPaneNode, TabContextTarget } from "../viewmodel/IShellViewModel";
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
/** ViewModel 의 트리를 `Tab`이 요구하는 트리로 바꾼다 — 탭마다 descriptor의 아이콘·본문을 여기서 처음이자
 *  마지막으로 붙인다(Model·ViewModel 은 `ReactNode`를 갖지 않는다는 원칙). descriptor가 아직 없는 탭(복원 중)은
 *  빈 본문으로 둔다 — 붙는 순간 ViewModel이 다시 계산한다. */
const buildTree = (node: ShellTabPaneNode, descriptorOf: (tabId: string) => TabDescriptor | undefined): PaneRowNode => {
  if (node.kind === "leaf") {
    return {
      kind: "leaf",
      id: node.id,
      activeTabId: node.activeTabId,
      tabs: node.tabs.map((tab): TabRow => {
        const descriptor = descriptorOf(tab.id);
        return {
          id: tab.id,
          kind: tab.kind,
          title: tab.title,
          icon: descriptor?.icon ?? null,
          Content: descriptor?.Content ?? EmptyContent,
          isPreview: tab.isPreview,
          isDirty: tab.isDirty,
        };
      }),
      size: node.size,
    };
  }
  return {
    kind: "split",
    id: node.id,
    orientation: node.orientation,
    children: node.children.map((child) => buildTree(child, descriptorOf)),
    size: node.size,
  };
};

/** descriptor가 아직 없는 탭의 본문 자리. */
const EmptyContent = () => null;

/**
 * 탭 우클릭 메뉴 — `shell.tab.context`에 담긴 명령들을 `Tab.renderTabMenu` 자리에 항목으로 그린다.
 * 우클릭한 탭이 `context`로 명령에 전달된다.
 */
const buildTabMenu = (commands: ICommandService) => (paneId: string, tabId: string) => {
  const context: TabContextTarget = { leafId: paneId, tabId };

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

export const ShellView = observer(function ShellView() {
  const viewModel = useViewModel("arka.workbench.shellViewModel");
  const sidebarContentRegistry = useViewModel("arka.workbench.sidebarContentRegistry");
  const commandCenterRegistry = useViewModel("arka.commands");

  /** 저장 안 된 탭을 닫으려 하면 확인을 구한다 — dirty 여부는 ViewModel이 descriptor에 묻는다. */
  const onTabClose = (leafId: string, tabId: string) => {
    viewModel.requestCloseTab(leafId, tabId);
  };

  /** 탭 본문을 그 탭의 자식 컨테이너로 감싼다 — 탭 안에서 `useViewModel`이 꺼내는 것은 거기서 온다. */
  const renderContent = (_paneId: string, tabId: string): ReactNode => {
    const descriptor = viewModel.descriptorOf(tabId);
    if (descriptor === undefined) return null;
    const contentProps: TabContentProps = { tabId };
    return (
      <ContainerProvider container={viewModel.containerOf(tabId)}>
        <descriptor.Content {...contentProps} />
      </ContainerProvider>
    );
  };

  // 확장이 내는 본문은 커널에게서 아무것도 받지 않는다 — 파일을 여는 것도 명령이다.
  const renderSlot = (Slot: ComponentType | undefined): ReactNode => (Slot === undefined ? null : <Slot />);

  const activeActivity = viewModel.activities.find((activity) => activity.isActive);
  const activeActivityId = activeActivity?.id ?? null;
  const sidebar = activeActivityId === null ? undefined : sidebarContentRegistry.tryGet(activeActivityId);
  const sidebarContent = renderSlot(sidebar?.ContentComponent);
  const uiTree = buildTree(viewModel.tree, (tabId) => viewModel.descriptorOf(tabId));

  // 팔레트 목록은 커맨드 registry를 그대로 옮긴 것이다 — 등록은 부팅 시 한 번 끝나므로 매 렌더
  // 다시 계산해도 가볍다.
  const keybindingOf = (actionId: string): string => {
    // 사용자 재정의가 있으면 그것이 실효 키다. `null`은 꺼 둔 것이라 안 보인다.
    const effective = commandCenterRegistry.overrides.has(actionId)
      ? commandCenterRegistry.overrides.get(actionId)
      : commandCenterRegistry.keybindings.list().find((entry) => entry.actionId === actionId)?.keybinding;
    return typeof effective === "string" ? effective : "";
  };
  const commandRows = commandCenterRegistry.actions
    .list()
    .map((action) => ({ id: action.id, label: action.label, keybinding: keybindingOf(action.id) }));
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
            query={viewModel.paletteQuery}
            onQueryChange={(value) => viewModel.setPaletteQuery(value)}
            rows={commandRows}
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
        sidebars={viewModel.activities.map((activity) => ({
          id: activity.id,
          title: activity.title,
          iconId: activity.iconId as IconId,
          isActive: activity.isActive,
        }))}
        onSidebarSelect={(id) => viewModel.selectActivity(id)}
        onSettingsSelect={() => commandCenterRegistry.execute("shell.openSettings")}
        sidebarContent={sidebarContent}
        sidebarTitle={sidebar === undefined ? undefined : activeActivity?.title}
        sidebarOpen={viewModel.isSidebarOpen}
        onSidebarOpenChange={(open) => viewModel.setSidebarOpen(open)}
        sidebarResizable
        sidebarWidthStorageKey="arka-workbench:sidebar-width"
      >
        <Tab
          className={styles["tab"]}
          chrome="none"
          tree={uiTree}
          activePaneId={viewModel.activeLeafId}
          renderContent={renderContent}
          onSelect={(paneId, tabId) => viewModel.selectTab(paneId, tabId)}
          onClose={onTabClose}
          onReorder={(paneId, nextTabIds) => viewModel.reorderTabs(paneId, nextTabIds)}
          onPin={(_paneId, tabId) => viewModel.pinTab(tabId)}
          onSplit={(paneId, tabId, edge) => viewModel.splitTab(paneId, tabId, edge)}
          onResize={(branchId, childId, nextSize) => viewModel.resizeNode(branchId, childId, nextSize)}
          renderTabMenu={buildTabMenu(commandCenterRegistry)}
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
