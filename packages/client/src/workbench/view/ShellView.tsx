import { CommandCenterRegistryToken } from '#core/commands';
import { FileContentViewModelToken } from '../../filesystem/tokens';
import { ShellViewModelToken, SidebarContentRegistryToken, TabContentRegistryToken } from '../tokens';
import { matchMenuItems } from '#core/menu';
import { useViewModel } from '#core/view-model';
import { Button } from '@primer/react';
import { CommandPalette, ContextMenu, Dialog, Icon, ModeToggle, Shell, Tab, Text } from '../../../shared/components';
import type { IconId, TabItem, TabTreeNode } from '../../../shared/components';
import type { ReactNode } from 'react';
import type { FileRowMap } from '../../filesystem';
import type { ICommandCenterRegistry } from '#core/commands';
import type { ITabContentRegistry } from '../model/ITabContentRegistry';
import type { ShellTabPaneNode, ShellTabRow, TabContextTarget } from '../viewmodel/IShellViewModel';
import styles from './ShellView.module.css';

/**
 * DI·구독·마크업이 한 파일에 있다(2026-09-04, D9) — `useViewModel` 하나만 부른다는 규율
 * (`view-only-uses-view-model`)로 "DI를 아는 파일을 하나로 가둔다"를 지킨다. `useCallback`도
 * 이 파일에 없다 — 메모이즈해서 감싸던 핸들러는 전부 로직이 없는 순수 배선이거나(그대로 인라인),
 * 로직이면 ViewModel로 옮겼다.
 *
 * 전역 배선(키다운 디스패치·beforeunload 가드·빌드ID 조회·테마 DOM 반영)은 여기 없다 — Shell
 * 자신의 도메인 로직이 아니라 앱 전체 단위 배선이라 `src/app/App.tsx`(View 규율 밖)로 옮겼다.
 * `buildId`는 그래서 props로 받는다.
 *
 * 탭 닫기 확인은 `window.confirm` 대신 `IShellViewModel.pendingTabClose` + 기존 `Dialog`다
 * (2026-09-04 — 네이티브 대화상자는 앱 UI와 다르게 생겨 일관성이 없다는 판단).
 */
const DOES_NOTHING_YET = () => {};

type ShellTabDisplayRow = ShellTabRow & { readonly isDirty: boolean; readonly iconId: string };
type ShellTabDisplayNode =
  | { readonly kind: 'leaf'; readonly id: string; readonly tabs: readonly ShellTabDisplayRow[]; readonly activeTabId: string | null; readonly size?: number }
  | { readonly kind: 'split'; readonly id: string; readonly orientation: 'horizontal' | 'vertical'; readonly children: readonly ShellTabDisplayNode[]; readonly size?: number };

/**
 * `IShellViewModel.tree` 에는 없는 `isDirty`·`iconId` 를 이 트리 전체에 병합한다 — 둘 다 다른
 * 모듈(`filesystem`의 dirty 상태, `ITabContentRegistry`의 아이콘)이 아는 것이라 ViewModel 은
 * 모른다. 순수 함수라 훅이 아니다 — 렌더 본문에서 그냥 부른다.
 */
const mergeTabDisplay = (node: ShellTabPaneNode, fileRows: FileRowMap, tabContentRegistry: ITabContentRegistry): ShellTabDisplayNode => {
  if (node.kind === 'leaf') {
    return {
      ...node,
      tabs: node.tabs.map((tab) => ({
        ...tab,
        isDirty: fileRows[tab.id]?.isDirty ?? false,
        iconId: tabContentRegistry.tryGet(tab.kind)?.iconId ?? 'file',
      })),
    };
  }
  return { ...node, children: node.children.map((child) => mergeTabDisplay(child, fileRows, tabContentRegistry)) };
};

/** ViewModel 의 트리를 `@arka/ui`의 `Tab`이 요구하는 트리로 바꾼다 — 탭마다 `content`를 여기서
 *  처음이자 마지막으로 채워 넣는다(Model·ViewModel 은 `ReactNode`를 갖지 않는다는 원칙). */
const buildTree = (node: ShellTabDisplayNode, renderTab: (tab: ShellTabRow) => ReactNode): TabTreeNode => {
  if (node.kind === 'leaf') {
    return {
      kind: 'leaf',
      id: node.id,
      activeTab: node.activeTabId ?? '',
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
    kind: 'split',
    id: node.id,
    orientation: node.orientation,
    children: node.children.map((child) => buildTree(child, renderTab)),
    size: node.size,
  };
};

/** 우클릭 메뉴엔 `tab`만 넘어오고 어느 pane 소속인지는 안 딸려온다 — 그래서 트리를 훑어 역으로 찾는다. */
const findLeafIdForTab = (node: TabTreeNode, tabId: string): string | null => {
  if (node.kind === 'leaf') return node.tabItems.some((item) => item.id === tabId) ? node.id : null;
  for (const child of node.children) {
    const found = findLeafIdForTab(child, tabId);
    if (found) return found;
  }
  return null;
};

/**
 * 탭 우클릭 메뉴를 `menuId: 'shell.tab.context'`(`shellCommands.ts`가 등록) 조회로 그린다 —
 * `CommandContextMenu`(`CommandMenuView`)를 그대로 못 쓰는 이유는, 그건 자기 `ContextMenu.Trigger`
 * 를 새로 감싸는데 `Tab.tsx`가 `renderTabContextMenu`를 이미 `ContextMenu.Content` 안에서 부르기
 * 때문이다 — 여기선 항목(`ContextMenu.Item`)만 돌려준다.
 */
const buildTabContextMenu = (tree: TabTreeNode, commandCenterRegistry: ICommandCenterRegistry) => (tab: TabItem) => {
  const leafId = findLeafIdForTab(tree, tab.id);
  if (!leafId) return null;
  const context: TabContextTarget = { leafId, tabId: tab.id };

  const items = matchMenuItems(commandCenterRegistry.menuRegistry, commandCenterRegistry.contextRegistry, 'shell.tab.context')
    .map((menuItem) => {
      const command = commandCenterRegistry.commandRegistry.tryGet(menuItem.commandId);
      return command === undefined ? null : { id: menuItem.id, label: command.label, commandId: menuItem.commandId };
    })
    .filter((item) => item !== null);

  return (
    <>
      {items.map((item) => (
        <ContextMenu.Item key={item.id} onSelect={() => commandCenterRegistry.commandRegistry.tryGet(item.commandId)?.execute(context)}>
          {item.label}
        </ContextMenu.Item>
      ))}
    </>
  );
};

/**
 * 다른 모듈을 Shell 에 잇는 **유일한 자리** — `sidebarContentRegistry`·`tabContentRegistry`를
 * 조회해서 그릴 뿐이다(`registries/`). 어떤 모듈이 무엇을 등록했는지는 `application.ts`만 안다.
 *
 * **저장 안 된 변경도 여기서 합친다.** `fileContentViewModel` 은 `FileContentView` 가 이미 쓰고
 * 있는 것과 **같은 인스턴스**다(`useViewModel` 은 앱 전체가 공유하는 awilix 컨테이너에서 이름으로
 * 꺼낼 뿐이다) — 그래서 여기서 한 번 더 구독해도 상태가 갈리지 않는다. 파일 감시(startWatching)는
 * 더 이상 여기서 걸지 않는다 — `IShellViewModel.onMount`가 대신 건다(useViewModel이 자동으로 부른다,
 * Shell이 앱 전체에서 한 번만 마운트되는 루트이기 때문이다).
 */
export const ShellView = ({ buildId }: { readonly buildId: string }) => {
  const viewModel = useViewModel(ShellViewModelToken);
  const fileContentViewModel = useViewModel(FileContentViewModelToken);
  const sidebarContentRegistry = useViewModel(SidebarContentRegistryToken);
  const tabContentRegistry = useViewModel(TabContentRegistryToken);
  const commandCenterRegistry = useViewModel(CommandCenterRegistryToken);

  const onFileOpen = (path: string) => viewModel.previewFile(path);
  const onFilePin = (path: string) => viewModel.pinTab(path);
  /**
   * 탭(경로 참조)과 편집 버퍼(내용·dirty)는 서로 다른 모델이라 둘 다 옮겨야 한다 — `retargetTabs`만
   * 부르면 탭은 새 경로를 가리키지만 그 경로로 다시 `openFile`이 불려 편집 중이던 내용을 잃는다.
   */
  const onFileMove = (oldPath: string, newPath: string) => {
    viewModel.retargetTabs(oldPath, newPath);
    fileContentViewModel.retargetOpenFile(oldPath, newPath);
  };

  /** 저장 안 된 파일 탭을 닫으려 하면 확인을 구한다 — dirty 여부는 `filesystem` 모듈 소관이라
   *  여기서 계산해 값으로 건넨다(ViewModel은 다른 도메인을 모른다). */
  const onTabClose = (leafId: string, tabId: string) => {
    viewModel.requestCloseTab(leafId, tabId, fileContentViewModel.rows[tabId]?.isDirty ?? false);
  };

  const renderTab = (tab: ShellTabRow): ReactNode => {
    const TabComponent = tabContentRegistry.tryGet(tab.kind)?.TabComponent;
    return TabComponent ? <TabComponent tabId={tab.id} /> : null;
  };

  const renderPanel = (activityId: string): ReactNode => {
    const PanelComponent = sidebarContentRegistry.tryGet(activityId)?.PanelComponent;
    return PanelComponent ? <PanelComponent onFileOpen={onFileOpen} onFileMove={onFileMove} onFilePin={onFilePin} /> : null;
  };

  const treeWithDirty = mergeTabDisplay(viewModel.tree, fileContentViewModel.rows, tabContentRegistry);
  const activeActivityId = viewModel.activities.find((activity) => activity.isActive)?.id ?? null;
  const panelContent = activeActivityId === null ? null : renderPanel(activeActivityId);
  const uiTree = buildTree(treeWithDirty, renderTab);

  // 팔레트 목록은 커맨드 registry를 그대로 옮긴 것이다 — 등록은 부팅 시 한 번 끝나므로 매 렌더
  // 다시 계산해도 가볍다.
  const commandItems = commandCenterRegistry.commandRegistry.list().map((command) => ({ id: command.id, label: command.label }));
  const onCommandSelect = (id: string) => {
    commandCenterRegistry.commandRegistry.tryGet(id)?.execute(undefined);
    viewModel.setPaletteOpen(false);
  };

  const pendingTabClose = viewModel.pendingTabClose;

  return (
    <>
      <Shell
        colorMode={viewModel.theme as 'light' | 'dark'}
        overlays={
          <CommandPalette
            open={viewModel.isPaletteOpen}
            onOpenChange={(open) => viewModel.setPaletteOpen(open)}
            items={commandItems}
            onSelect={onCommandSelect}
          />
        }
        brand={
          <span className={styles['brandGroup']}>
            <img src="/arka-mark.svg" alt="" width={20} height={20} />
            <span className={styles['brandText']}>ARKA</span>
          </span>
        }
        actions={
          <span className={styles['trailingGroup']}>
            <Text size="small" tone="muted" className={styles['buildId']}>
              {buildId}
            </Text>
            <ModeToggle
              values={['light', 'dark']}
              value={viewModel.theme}
              labels={['어둡게 전환', '밝게 전환']}
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
        sidebarOpen={viewModel.isSidebarOpen}
        onSidebarOpenChange={(open) => viewModel.setSidebarOpen(open)}
        sidebarAriaLabel="사이드바"
        sidebarResizable
        sidebarWidthStorageKey="arka-workbench:sidebar-width"
      >
        <Tab
          className={styles['tab']}
          chrome="none"
          tree={uiTree}
          activeLeaf={viewModel.activeLeafId}
          onTabClick={(leafId, tabId) => viewModel.selectTab(leafId, tabId)}
          onTabClose={onTabClose}
          onTabReorder={(leafId, nextItems) => viewModel.reorderTabs(leafId, nextItems.map((item) => item.id))}
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

      {pendingTabClose === null ? null : (
        <Dialog
          onClose={() => viewModel.cancelCloseTab()}
          iconId="warning"
          tone="attention"
          title="저장하지 않은 변경사항이 있다"
          description="닫으면 사라진다 — 그래도 닫을까?"
        >
          <Dialog.Actions>
            <Button variant="default" onClick={() => viewModel.cancelCloseTab()}>
              취소
            </Button>
            <Button variant="danger" onClick={() => viewModel.confirmCloseTab()}>
              닫기
            </Button>
          </Dialog.Actions>
        </Dialog>
      )}
    </>
  );
};
