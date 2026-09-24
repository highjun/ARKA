import { ContainerProvider, useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Banner, ConfirmationDialog } from "@primer/react";
import { Menu } from "#component/Menu";
import { Text } from "#component/Text";
import { Toast } from "#component/Toast";
import { Shell } from "../component/Shell";
import { Tab } from "../component/Tab";
import { PRODUCT_NAME } from "../model/product";
import type { ReactNode } from "react";
import type { ICommandService } from "#core/commands";
import type { TabContentProps } from "../model/ITabProviderDescriptor";
import type { TabTree } from "../component/Tab";
import type { PaneRowNode, TabContextTarget, TabRow } from "../viewmodel/ITabSystemViewModel";
import styles from "./ShellView.module.css";

const collectRows = (node: PaneRowNode): readonly TabRow[] =>
  node.kind === "leaf" ? node.tabs : node.children.flatMap(collectRows);

/**
 * ViewModel의 칸 트리를 `Tab`이 읽는 모양으로 옮긴다.
 * 두 계층이 같은 트리를 따로 선언하고 있어서 생긴 자리 — 타입을 합치면 사라진다.
 */
const toTabTree = (node: PaneRowNode): TabTree =>
  node.kind === "leaf"
    ? { kind: "group", id: node.id, items: node.tabs, activeItemId: node.activeTabId, size: node.size }
    : {
        kind: "split",
        id: node.id,
        orientation: node.orientation,
        children: node.children.map(toTabTree),
        size: node.size,
      };

const buildTabMenu = (commands: ICommandService) => (paneId: string, tabId: string) => {
  const context: TabContextTarget = { paneId, tabId };

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
  const shell = useViewModel("arka.workbench.shellViewModel");
  const tabs = useViewModel("arka.workbench.tabSystemViewModel");
  const notifications = useViewModel("arka.workbench.notificationViewModel");
  const appStatus = useViewModel("arka.workbench.appStatusViewModel");
  const palette = useViewModel("arka.workbench.commandPaletteViewModel");
  const commands = useViewModel("arka.commands");

  const tree = tabs.tree;
  const rowsById = new Map(collectRows(tree).map((row) => [row.id, row] as const));

  const renderContent = (tabId: string): ReactNode => {
    const row = rowsById.get(tabId);
    if (row === undefined) return null;
    const contentProps: TabContentProps = { tabId };
    return (
      <ContainerProvider container={tabs.containerOf(tabId)}>
        <row.Content {...contentProps} />
      </ContainerProvider>
    );
  };

  const sidebarRows = shell.sidebars;
  const sidebarById = new Map(sidebarRows.map((row) => [row.id, row] as const));
  const activeSidebarId = shell.activeSidebarId;
  const activeBottom = shell.activeBottom;
  const pendingClose = tabs.pendingClose;

  return (
    <>
      {appStatus.isOutdated ? (
        <Banner
          role="status"
          variant="warning"
          layout="compact"
          flush
          title="새 버전이 있다"
          description="이 화면은 서버와 다른 프로토콜을 쓰고 있다."
          primaryAction={<Banner.PrimaryAction onClick={() => appStatus.reload()}>다시 불러오기</Banner.PrimaryAction>}
        />
      ) : null}
      <Shell
        colorMode={shell.colorMode}
        isNarrow={shell.isNarrow}
        overlays={
          <>
            {notifications.toasts.length === 0 ? null : (
              <Toast>
                {notifications.toasts.map((item) => (
                  <Toast.Item
                    key={item.id}
                    severity={item.severity}
                    message={item.message}
                    timeout={item.timeout}
                    onDismiss={() => notifications.markRead(item.id)}
                    onTimeout={() => notifications.dismissToast(item.id)}
                  />
                ))}
              </Toast>
            )}
          </>
        }
        brandName={PRODUCT_NAME}
        brandIconSrc="/arka-mark.svg"
        paletteOpen={palette.isOpen}
        paletteQuery={palette.query}
        paletteRows={palette.rows}
        paletteKeybinding={palette.keybinding}
        onPaletteOpenChange={(open) => (open ? palette.open() : palette.close())}
        onPaletteQueryChange={(value) => palette.setQuery(value)}
        onPaletteSelect={(actionId) => palette.run(actionId)}
        buildTimestamp={appStatus.builtAt}
        buildSha={appStatus.gitSha === "" ? undefined : appStatus.gitSha}
        notificationCount={notifications.unreadCount}
        onNotificationsOpen={() => commands.execute("shell.openNotifications")}
        onColorModeToggle={() => shell.toggleColorMode()}
        sidebars={sidebarRows}
        activeSidebarId={activeSidebarId}
        onSidebarSelect={(id) => shell.toggleSidebar(id)}
        onSettingsSelect={() => commands.execute("shell.openSettings")}
        sidebarTitle={activeSidebarId === null ? undefined : sidebarById.get(activeSidebarId)?.title}
        renderSidebarContent={(id) => {
          const row = sidebarById.get(id);
          return row === undefined ? null : <row.Content />;
        }}
        sidebarOpen={shell.isSidebarOpen}
        onSidebarOpenChange={(open) => shell.setSidebarOpen(open)}
        sidebarResizable
        sidebarWidthStorageKey="arka-workbench:sidebar-width"
        bottoms={shell.bottoms}
        activeBottomId={activeBottom?.id ?? null}
        bottomContent={activeBottom === null ? undefined : <activeBottom.Content />}
        onBottomSelect={(id) => shell.toggleBottom(id)}
        onSidebarToggle={() => shell.toggleSidebarExpanded()}
        onBottomToggle={() => shell.toggleBottomOpen()}
      >
        <Tab
          className={styles["tab"]}
          tree={toTabTree(tree)}
          activeGroupId={tabs.activePaneId}
          renderContent={renderContent}
          onItemSelect={(groupId, itemId) => tabs.selectTab(groupId, itemId)}
          onItemClose={(groupId, itemId) => tabs.requestCloseTab(groupId, itemId)}
          onItemMove={(groupId, itemId, beforeItemId) => tabs.moveTab(groupId, itemId, beforeItemId)}
          onItemPin={(_groupId, itemId) => tabs.pinTab(itemId)}
          onGroupSplit={(groupId, itemId, edge) => tabs.splitTab(groupId, itemId, edge)}
          onSplitResize={(splitId, childId, nextSize) => tabs.resizePane(splitId, childId, nextSize)}
          renderItemMenu={buildTabMenu(commands)}
          emptyMessage={
            <Text size="small" tone="muted">
              탐색기에서 파일을 고르세요.
            </Text>
          }
        />
      </Shell>

      {pendingClose === null ? null : (
        <ConfirmationDialog
          title="저장하지 않은 변경사항이 있다"
          confirmButtonContent="닫기"
          cancelButtonContent="취소"
          confirmButtonType="danger"
          onClose={(gesture) => (gesture === "confirm" ? tabs.confirmClose() : tabs.cancelClose())}
        >
          닫으면 사라진다 — 그래도 닫을까?
        </ConfirmationDialog>
      )}
    </>
  );
});
