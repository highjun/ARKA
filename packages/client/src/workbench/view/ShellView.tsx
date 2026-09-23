import { ContainerProvider, useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Banner, ConfirmationDialog, CounterLabel } from "@primer/react";
import { Menu } from "#component/Menu";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { ModeToggle } from "#component/ModeToggle";
import { Text } from "#component/Text";
import { Toast } from "#component/Toast";
import { CommandPalette } from "../component/CommandPalette";
import { Shell } from "../component/Shell";
import { Tab } from "../component/Tab";
import { PRODUCT_NAME } from "../model/product";
import type { ReactNode } from "react";
import type { ICommandService } from "#core/commands";
import type { TabContentProps } from "../model/ITabProviderDescriptor";
import type { PaneRowNode, TabContextTarget, TabRow } from "../viewmodel/ITabSystemViewModel";
import styles from "./ShellView.module.css";

const collectRows = (node: PaneRowNode): readonly TabRow[] =>
  node.kind === "leaf" ? node.tabs : node.children.flatMap(collectRows);

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

  const renderContent = (_paneId: string, tabId: string): ReactNode => {
    const row = rowsById.get(tabId);
    if (row === undefined) return null;
    const contentProps: TabContentProps = { tabId };
    return (
      <ContainerProvider container={tabs.containerOf(tabId)}>
        <row.Content {...contentProps} />
      </ContainerProvider>
    );
  };

  const activeSidebar = shell.activeSidebar;
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
            <CommandPalette
              open={palette.isOpen}
              onOpenChange={(open) => (open ? palette.open() : palette.close())}
              query={palette.query}
              onQueryChange={(value) => palette.setQuery(value)}
              rows={palette.rows}
              onSelect={(actionId) => palette.run(actionId)}
            />
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
        brand={
          <span className={styles["brandGroup"]}>
            <img src="/arka-mark.svg" alt="" width={20} height={20} />
            <span className={styles["brandText"]}>{PRODUCT_NAME}</span>
          </span>
        }
        center={<CommandPalette.Trigger keybinding={palette.keybinding} onClick={() => palette.open()} />}
        actions={
          <span className={styles["trailingGroup"]}>
            <Text size="small" tone="muted" className={styles["buildId"]}>
              {appStatus.buildId}
            </Text>
            <span className={styles["bell"]}>
              <IconButton
                variant="invisible"
                size="small"
                aria-label={
                  notifications.unreadCount === 0 ? "알림" : `안 읽은 알림 ${String(notifications.unreadCount)}건`
                }
                onClick={() => commands.execute("shell.openNotifications")}
                icon={() => <Icon iconId="bell" size="sm" />}
              />
              {notifications.unreadCount === 0 ? null : (
                <CounterLabel scheme="primary" className={styles["bellBadge"]}>
                  {notifications.unreadCount}
                </CounterLabel>
              )}
            </span>
            <ModeToggle
              values={["light", "dark"]}
              value={shell.colorMode}
              labels={["어둡게 전환", "밝게 전환"]}
              onValueChange={() => shell.toggleColorMode()}
            >
              {[<Icon key="sun" iconId="sun" size="sm" />, <Icon key="moon" iconId="moon" size="sm" />]}
            </ModeToggle>
          </span>
        }
        sidebars={shell.sidebars}
        activeSidebarId={shell.activeSidebarId}
        onSidebarSelect={(id) => shell.toggleSidebar(id)}
        onSettingsSelect={() => commands.execute("shell.openSettings")}
        sidebarTitle={activeSidebar?.title}
        sidebarContent={activeSidebar === null ? undefined : <activeSidebar.Content />}
        sidebarActions={activeSidebar?.actions}
        onSidebarActionActivate={(actionId) => commands.execute(actionId)}
        sidebarOpen={shell.isSidebarOpen}
        onSidebarOpenChange={(open) => shell.setSidebarOpen(open)}
        sidebarResizable
        sidebarWidthStorageKey="arka-workbench:sidebar-width"
        bottoms={shell.bottoms}
        bottomContent={activeBottom === null ? undefined : <activeBottom.Content />}
        onBottomSelect={(id) => shell.toggleBottom(id)}
        onSidebarToggle={() => shell.toggleSidebarExpanded()}
        onBottomToggle={() => shell.toggleBottomOpen()}
      >
        <Tab
          className={styles["tab"]}
          chrome="none"
          tree={tree}
          activePaneId={tabs.activePaneId}
          isNarrow={shell.isNarrow}
          renderContent={renderContent}
          onSelect={(paneId, tabId) => tabs.selectTab(paneId, tabId)}
          onClose={(paneId, tabId) => tabs.requestCloseTab(paneId, tabId)}
          onReorder={(paneId, nextTabIds) => tabs.reorderTabs(paneId, nextTabIds)}
          onPin={(_paneId, tabId) => tabs.pinTab(tabId)}
          onSplit={(paneId, tabId, edge) => tabs.splitTab(paneId, tabId, edge)}
          onResize={(branchId, childId, nextSize) => tabs.resizePane(branchId, childId, nextSize)}
          renderTabMenu={buildTabMenu(commands)}
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
