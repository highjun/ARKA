import { createRegistry } from '#core';
import type { ITabDirtyState } from '../model/ITabDirtyState';
import type { IWorkbenchStartup } from '../model/IWorkbenchStartup';
import type { IServerInfo } from '../model/IServerInfo';
import { NotificationService } from '../model/NotificationService';
import type { ICommandCenterRegistry } from '#core/commands';
import { ActivityModel } from '../model/ActivityModel';
import { ROOT_PANE_ID } from '../model/tabsShare';
import { TabsModel } from '../model/TabsModel';
import type { ITabsModel } from '../model/ITabsModel';
import { ThemeModel } from '../model/ThemeModel';
import type { IStorage } from '../model/IStorage';
import type { IActivityBarRegistry } from '../model/IActivityBarRegistry';
import { ShellViewModel } from './ShellViewModel';
import type { ShellTabPaneLeaf, ShellTabPaneNode, IShellViewModel } from './IShellViewModel';

/** 커맨드 등록만 받아주는 흉내 — 이 파일의 관심사는 탭 트리·활동 로직이지 커맨드 배선 자체가
 *  아니다(그건 `#registerCommands`가 실제로 등록하는지를 보는 별도 테스트의 몫). */
const fakeCommandCenterRegistry = (): ICommandCenterRegistry => ({
  commandRegistry: createRegistry(),
  contextRegistry: createRegistry(),
  keybindingRegistry: createRegistry(),
  menuRegistry: createRegistry(),
  registerCommand: () => undefined,
  registerContext: () => undefined,
  registerKeybinding: () => undefined,
  registerMenuItem: () => undefined,
  dispatchKeydown: () => false,
});

const fakeStorage = (): IStorage => {
  const store = new Map<string, string>();
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
  };
};

/** 셸이 선언한 계약의 가짜다 — filesystem을 알 필요가 없다. `dirty`에 탭 id를 넣으면 그
 *  탭이 저장 안 된 것으로 보인다. */
const fakeTabDirtyState = (): ITabDirtyState & { dirty: Set<string> } => {
  const dirty = new Set<string>();
  return {
    dirty,
    isDirty: (tabId) => dirty.has(tabId),
    hasAnyDirty: () => dirty.size > 0,
    onDidChange: () => ({ dispose: () => undefined }),
  };
};

/** 켜졌는지만 본다 — 무엇이 켜지는지는 셸의 관심이 아니다. */
const fakeStartup = (): IWorkbenchStartup & { started: boolean } => {
  const state = { started: false };
  return {
    get started() {
      return state.started;
    },
    start: () => {
      state.started = true;
    },
    stop: () => {
      state.started = false;
    },
  };
};

/** 진짜 Model 을 조립한다 — I/O 가 없어 바꿔 낄 이유가 없다. `activityBarRegistry`는 탐색기
 *  하나만 등록한 가짜다 — 진짜(`registerServices.tsx`)와 같은 모양이면 충분하다. */
const make = (serverInfo: IServerInfo = { load: () => Promise.resolve(null) }): { tabsModel: ITabsModel; viewModel: IShellViewModel; tabDirtyState: ITabDirtyState & { dirty: Set<string> }; startup: IWorkbenchStartup & { started: boolean }; notificationService: NotificationService } => {
  const activityBarRegistry: IActivityBarRegistry = createRegistry();
  activityBarRegistry.add({ id: 'explorer', title: '탐색기', iconId: 'files' });
  const tabDirtyState = fakeTabDirtyState();
  const startup = fakeStartup();
  const notificationService = new NotificationService({ newId: () => 'n' });
  const storage = fakeStorage();
  const activityModel = new ActivityModel();
  const tabsModel = new TabsModel({ storage });
  const themeModel = new ThemeModel({ storage });
  const viewModel = new ShellViewModel({
    activityModel,
    tabsModel,
    themeModel,
    activityBarRegistry,
    tabDirtyState,
    startup,
    serverInfo,
    notificationService,
    commandCenterRegistry: fakeCommandCenterRegistry(),
    copyToClipboard: () => undefined,
    reloadApp: () => undefined,
  });
  return { tabsModel, viewModel, tabDirtyState, startup, notificationService };
};

const activeIds = (viewModel: IShellViewModel): string[] =>
  viewModel.activities.filter((activity) => activity.isActive).map((activity) => activity.id);

const findLeaf = (node: ShellTabPaneNode, leafId: string): ShellTabPaneLeaf | null => {
  if (node.kind === 'leaf') return node.id === leafId ? node : null;
  for (const child of node.children) {
    const found = findLeaf(child, leafId);
    if (found) return found;
  }
  return null;
};

/** 지금 활성 leaf. 없으면 테스트가 잘못된 것이다(불변 위반) — 조용히 넘기지 않고 던진다. */
const activeLeafOf = (viewModel: IShellViewModel): ShellTabPaneLeaf => {
  const leaf = findLeaf(viewModel.tree, viewModel.activeLeafId);
  if (!leaf) throw new Error('activeLeafId가 트리 안에 없다');
  return leaf;
};

const tabIdsOf = (leaf: ShellTabPaneLeaf): string[] => leaf.tabs.map((tab) => tab.id);

describe('IShellViewModel — 활동', () => {
  it('탐색기 하나를 내고, 처음부터 활성이다', () => {
    const { viewModel } = make();

    expect(viewModel.activities).toEqual([{ id: 'explorer', title: '탐색기', iconId: 'files', isActive: true }]);
  });

  it('같은 활동을 다시 고르면 꺼진다', () => {
    const { viewModel } = make();

    viewModel.selectActivity('explorer');

    expect(activeIds(viewModel)).toEqual([]);
  });

  it('Model 이 모르는 활동은 무시한다', () => {
    const { viewModel } = make();

    viewModel.selectActivity('없는활동');

    expect(activeIds(viewModel)).toEqual(['explorer']);
  });
});

describe('IShellViewModel — 파일 미리보기', () => {
  it('탭 제목은 경로가 아니라 파일 이름이다 — 폰의 좁은 스트립에 경로가 들어가지 않는다', () => {
    const { viewModel } = make();

    viewModel.previewFile('projects/dev-kit/STATUS.md');

    expect(activeLeafOf(viewModel).tabs.at(-1)).toEqual({
      id: 'projects/dev-kit/STATUS.md',
      kind: 'file',
      title: 'STATUS.md',
      isPreview: true,
      isDirty: false,
    });
  });

  it('미리보기는 자리 하나를 갈아끼운다 — 훑는 것만으로 탭이 쌓이지 않는다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    viewModel.previewFile('b.md');
    viewModel.previewFile('c.md');

    const leaf = activeLeafOf(viewModel);
    expect(tabIdsOf(leaf)).toEqual(['c.md']);
    expect(leaf.activeTabId).toBe('c.md');
  });

  it('같은 파일을 두 번 열면 고정된다 — 다음 미리보기가 밀어내지 못한다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    viewModel.previewFile('a.md');
    viewModel.previewFile('b.md');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a.md', 'b.md']);
  });

  it('고정한 탭이 있어도 미리보기 자리는 계속 하나다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    // 고정
    viewModel.previewFile('a.md');
    viewModel.previewFile('b.md');
    viewModel.previewFile('c.md');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a.md', 'c.md']);
  });

  it('미리보기 탭을 닫으면 다음 미리보기가 새 탭이 된다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    viewModel.closeTab(ROOT_PANE_ID, 'a.md');
    viewModel.previewFile('b.md');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['b.md']);
  });

  it('루트 바로 아래 파일은 경로가 곧 이름이다', () => {
    const { viewModel } = make();

    viewModel.previewFile('AGENTS.md');

    expect(activeLeafOf(viewModel).tabs.at(-1)?.title).toBe('AGENTS.md');
  });
});

describe('IShellViewModel — 탭 고르기', () => {
  it('없는 leaf를 고르면 활성이 바뀌지 않는다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    viewModel.selectTab('없는pane', 'a.md');

    expect(activeLeafOf(viewModel).activeTabId).toBe('a.md');
  });

  it('있는 leaf여도 그 leaf에 없는 탭을 고르면 무시한다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    viewModel.selectTab(ROOT_PANE_ID, '없는탭');

    expect(activeLeafOf(viewModel).activeTabId).toBe('a.md');
  });
});

describe('IShellViewModel — 탭', () => {
  it('탭이 없으면 activeLeafId는 root이고 트리는 빈 루트 leaf다', () => {
    const { viewModel } = make();

    expect(viewModel.activeLeafId).toBe(ROOT_PANE_ID);
    expect(viewModel.tree).toEqual({ kind: 'leaf', id: ROOT_PANE_ID, tabs: [], activeTabId: null });
  });

  it('없는 탭을 닫으면 아무 일도 일어나지 않는다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    viewModel.closeTab(ROOT_PANE_ID, '없는탭');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a.md']);
  });

  it('Model 의 트리가 그대로 비친다', () => {
    const { tabsModel, viewModel } = make();

    tabsModel.setTree({ kind: 'leaf', id: ROOT_PANE_ID, tabs: [{ id: 'a', kind: 'file', title: 'a' }], activeTabId: 'a' });

    expect(activeLeafOf(viewModel)).toEqual({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [{ id: 'a', kind: 'file', title: 'a', isPreview: false, isDirty: false }],
      activeTabId: 'a',
    });
  });

  it('닫으면 이웃이 활성화된다 — 오른쪽 먼저, 없으면 왼쪽', () => {
    const { tabsModel, viewModel } = make();

    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: '1' },
        { id: 'b', kind: 'file', title: '2' },
      ],
      activeTabId: 'b',
    });
    viewModel.closeTab(ROOT_PANE_ID, 'b');

    expect(activeLeafOf(viewModel).activeTabId).toBe('a');
  });

  it('마지막 탭을 닫으면 빈 루트 leaf로 돌아간다', () => {
    const { tabsModel, viewModel } = make();

    tabsModel.setTree({ kind: 'leaf', id: ROOT_PANE_ID, tabs: [{ id: 'a', kind: 'file', title: '1' }], activeTabId: 'a' });
    viewModel.closeTab(ROOT_PANE_ID, 'a');

    expect(viewModel.tree).toEqual({ kind: 'leaf', id: ROOT_PANE_ID, tabs: [], activeTabId: null });
    expect(viewModel.activeLeafId).toBe(ROOT_PANE_ID);
  });
});

describe('IShellViewModel — closeOtherTabs', () => {
  const threeTabs = () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: 'a' },
        { id: 'b', kind: 'file', title: 'b' },
        { id: 'c', kind: 'file', title: 'c' },
      ],
      activeTabId: 'b',
    });
    return { tabsModel, viewModel };
  };

  it('넘긴 탭만 남기고 나머지를 닫는다', () => {
    const { viewModel } = threeTabs();

    viewModel.closeOtherTabs(ROOT_PANE_ID, 'b');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['b']);
  });

  it('protectedTabIds에 있는 탭은 남긴다 — 저장 안 된 변경을 잃지 않는다', () => {
    const { viewModel } = threeTabs();

    viewModel.closeOtherTabs(ROOT_PANE_ID, 'b', ['c']);

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['b', 'c']);
  });

  it('닫힌 탭이 활성이었으면 남긴 탭으로 활성을 옮긴다', () => {
    // activeTabId: 'b'
    const { viewModel } = threeTabs();

    viewModel.closeOtherTabs(ROOT_PANE_ID, 'a');

    expect(activeLeafOf(viewModel).activeTabId).toBe('a');
  });

  it('없는 leaf/탭이면 아무 일도 일어나지 않는다', () => {
    const { viewModel } = threeTabs();

    viewModel.closeOtherTabs(ROOT_PANE_ID, '없는탭');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a', 'b', 'c']);
  });
});

describe('IShellViewModel — closeTabsToRight', () => {
  const threeTabs = () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: 'a' },
        { id: 'b', kind: 'file', title: 'b' },
        { id: 'c', kind: 'file', title: 'c' },
      ],
      activeTabId: 'c',
    });
    return { tabsModel, viewModel };
  };

  it('기준 탭보다 뒤에 있는 탭을 전부 닫는다', () => {
    const { viewModel } = threeTabs();

    viewModel.closeTabsToRight(ROOT_PANE_ID, 'a');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a']);
  });

  it('protectedTabIds에 있는 탭은 남긴다', () => {
    const { viewModel } = threeTabs();

    viewModel.closeTabsToRight(ROOT_PANE_ID, 'a', ['c']);

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a', 'c']);
  });

  it('맨 오른쪽 탭 기준이면(닫을 게 없으면) 아무 일도 일어나지 않는다', () => {
    const { viewModel } = threeTabs();

    viewModel.closeTabsToRight(ROOT_PANE_ID, 'c');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a', 'b', 'c']);
  });

  it('닫힌 탭이 활성이었으면 기준 탭으로 활성을 옮긴다', () => {
    // activeTabId: 'c'
    const { viewModel } = threeTabs();

    viewModel.closeTabsToRight(ROOT_PANE_ID, 'a');

    expect(activeLeafOf(viewModel).activeTabId).toBe('a');
  });
});

describe('IShellViewModel — 미리보기 표시', () => {
  it('미리보기 탭만 isPreview 다 — 화면이 기울임으로 알린다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    // 고정
    viewModel.previewFile('a.md');
    viewModel.previewFile('b.md');

    const rows = activeLeafOf(viewModel).tabs;
    expect(rows.filter((tab) => tab.isPreview).map((tab) => tab.id)).toEqual(['b.md']);
  });

  it('고정하면 표시가 사라진다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    viewModel.previewFile('a.md');

    expect(activeLeafOf(viewModel).tabs.every((tab) => !tab.isPreview)).toBe(true);
  });

  it('pinTab을 부르면 미리보기 표시가 사라진다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    viewModel.pinTab('a.md');

    expect(activeLeafOf(viewModel).tabs.find((tab) => tab.id === 'a.md')?.isPreview).toBe(false);
  });

  it('미리보기 자리가 아닌 탭에 pinTab을 불러도 아무 일도 없다', () => {
    const { viewModel } = make();

    viewModel.previewFile('a.md');
    // a.md는 밀려나 고정된다
    viewModel.previewFile('b.md');

    viewModel.pinTab('a.md');

    expect(activeLeafOf(viewModel).tabs.find((tab) => tab.id === 'b.md')?.isPreview).toBe(true);
  });
});

describe('IShellViewModel — 분할', () => {
  it('가장자리로 분할하면 새 pane이 생기고 그리로 포커스가 옮겨간다', () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: 'a' },
        { id: 'b', kind: 'file', title: 'b' },
      ],
      activeTabId: 'a',
    });

    viewModel.splitTab(ROOT_PANE_ID, 'b', 'right');

    const tree = viewModel.tree;
    if (tree.kind !== 'split') throw new Error('split 노드여야 한다');
    expect(tree.orientation).toBe('horizontal');
    expect(tree.children.map((child) => child.id)).toEqual([ROOT_PANE_ID, `${ROOT_PANE_ID}-split-b`]);
    expect(viewModel.activeLeafId).toBe(`${ROOT_PANE_ID}-split-b`);
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['b']);

    const sourceLeaf = findLeaf(tree, ROOT_PANE_ID);
    expect(sourceLeaf && tabIdsOf(sourceLeaf)).toEqual(['a']);
  });

  it('왼쪽/위로 분할하면 새 pane이 먼저 그려지는 자리에 온다', () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: 'a' },
        { id: 'b', kind: 'file', title: 'b' },
      ],
      activeTabId: 'a',
    });

    viewModel.splitTab(ROOT_PANE_ID, 'b', 'top');

    const tree = viewModel.tree;
    if (tree.kind !== 'split') throw new Error('split 노드여야 한다');
    expect(tree.orientation).toBe('vertical');
    expect(tree.children.map((child) => child.id)).toEqual([`${ROOT_PANE_ID}-split-b`, ROOT_PANE_ID]);
  });

  it('없는 leaf·탭을 분할하려 하면 무시한다', () => {
    const { viewModel } = make();
    viewModel.previewFile('a.md');

    viewModel.splitTab('없는pane', 'a.md', 'right');
    viewModel.splitTab(ROOT_PANE_ID, '없는탭', 'right');

    expect(viewModel.tree.kind).toBe('leaf');
  });

  it('분할된 pane에서 마지막 탭을 닫으면 다시 단일 leaf로 접힌다', () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: 'a' },
        { id: 'b', kind: 'file', title: 'b' },
      ],
      activeTabId: 'a',
    });
    viewModel.splitTab(ROOT_PANE_ID, 'b', 'right');

    viewModel.closeTab(`${ROOT_PANE_ID}-split-b`, 'b');

    expect(viewModel.tree).toEqual({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [{ id: 'a', kind: 'file', title: 'a', isPreview: false, isDirty: false }],
      activeTabId: 'a',
    });
    expect(viewModel.activeLeafId).toBe(ROOT_PANE_ID);
  });
});

describe('IShellViewModel — 리사이즈', () => {
  it('분할된 branch 안 자식의 비율을 바꾼다', () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: 'a' },
        { id: 'b', kind: 'file', title: 'b' },
      ],
      activeTabId: 'a',
    });
    viewModel.splitTab(ROOT_PANE_ID, 'b', 'right');
    const branchId = viewModel.tree.id;

    viewModel.resizeNode(branchId, ROOT_PANE_ID, 35);

    const tree = viewModel.tree;
    if (tree.kind !== 'split') throw new Error('split 노드여야 한다');
    expect(tree.children.find((child) => child.id === ROOT_PANE_ID)?.size).toBe(35);
  });
});

describe('IShellViewModel — 재정렬', () => {
  it('leaf 안에서 탭 순서를 바꾼다', () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: 'a' },
        { id: 'b', kind: 'file', title: 'b' },
      ],
      activeTabId: 'a',
    });

    viewModel.reorderTabs(ROOT_PANE_ID, ['b', 'a']);

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['b', 'a']);
  });

  it('id 개수가 안 맞으면 무시한다 — View 가 들고 있던 탭 집합이 어긋난 것이다', () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: 'a' },
        { id: 'b', kind: 'file', title: 'b' },
      ],
      activeTabId: 'a',
    });

    viewModel.reorderTabs(ROOT_PANE_ID, ['a']);

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a', 'b']);
  });
});

describe('IShellViewModel — 분할된 상태에서 미리보기', () => {
  it('활성 pane 기준으로 연다 — 다른 pane 의 탭은 건드리지 않는다', () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'a', kind: 'file', title: 'a' },
        { id: 'b', kind: 'file', title: 'b' },
      ],
      activeTabId: 'a',
    });
    viewModel.splitTab(ROOT_PANE_ID, 'b', 'right');
    const otherLeafId = `${ROOT_PANE_ID}-split-b`;
    // 분할 직후엔 새 pane 이 활성이다
    expect(viewModel.activeLeafId).toBe(otherLeafId);

    // otherLeafId 에서 미리보기 하나 생김
    viewModel.previewFile('preview.md');
    // 다시 root 로 포커스 이동
    viewModel.selectTab(ROOT_PANE_ID, 'a');
    // root 에서 새로 미리보기
    viewModel.previewFile('other.md');

    const otherLeaf = findLeaf(viewModel.tree, otherLeafId);
    // 옛 미리보기 탭('preview.md')이 다른 pane 에 그대로 남아 있다 — 활성 pane 조작만으로 지워지지 않는다.
    expect(otherLeaf && tabIdsOf(otherLeaf)).toEqual(['b', 'preview.md']);
    expect(otherLeaf?.tabs.every((tab) => !tab.isPreview)).toBe(true);

    const rootLeaf = findLeaf(viewModel.tree, ROOT_PANE_ID);
    expect(rootLeaf && tabIdsOf(rootLeaf)).toEqual(['a', 'other.md']);
    expect(rootLeaf?.tabs.find((tab) => tab.id === 'other.md')?.isPreview).toBe(true);
  });
});

describe('IShellViewModel — 모바일 드로어', () => {
  it('처음에는 닫혀 있다', () => {
    expect(make().viewModel.isSidebarOpen).toBe(false);
  });

  it('파일을 열면 닫힌다 — 폰에서 드로어가 방금 연 파일을 가린다', () => {
    const { viewModel } = make();
    viewModel.setSidebarOpen(true);

    viewModel.previewFile('a.md');

    expect(viewModel.isSidebarOpen).toBe(false);
  });

  it('활동을 고르는 것은 닫지 않는다 — 활동 선택은 패널 안에서 하는 일이다', () => {
    const { viewModel } = make();
    viewModel.setSidebarOpen(true);

    viewModel.selectActivity('explorer');
    viewModel.selectActivity('explorer');

    expect(viewModel.isSidebarOpen).toBe(true);
  });

  it('직접 열고 닫을 수 있다', () => {
    const { viewModel } = make();

    viewModel.setSidebarOpen(true);
    expect(viewModel.isSidebarOpen).toBe(true);

    viewModel.setSidebarOpen(false);
    expect(viewModel.isSidebarOpen).toBe(false);
  });
});

describe('IShellViewModel — 커맨드 팔레트(2026-09-05, 옛 CommandCenterModel에서 이관)', () => {
  it('처음에는 닫혀 있다', () => {
    expect(make().viewModel.isPaletteOpen).toBe(false);
  });

  it('직접 열고 닫을 수 있다', () => {
    const { viewModel } = make();

    viewModel.setPaletteOpen(true);
    expect(viewModel.isPaletteOpen).toBe(true);

    viewModel.setPaletteOpen(false);
    expect(viewModel.isPaletteOpen).toBe(false);
  });
});

/**
 * 파일 탭의 id 는 경로 그 자체다. 드래그로 파일이 옮겨지거나 이름이 바뀌면 그 탭이 옛 경로를
 * 가리킨 채로 끊긴다 — `retargetTabs` 가 없으면 탭은 남아도 다시는 아무 파일과도 안 이어진다.
 */
describe('IShellViewModel — retargetTabs', () => {
  it('경로가 정확히 같은 파일 탭의 id·제목을 바꾼다', () => {
    const { viewModel } = make();
    viewModel.previewFile('old.txt');

    viewModel.retargetTabs('old.txt', 'new.txt');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['new.txt']);
  });

  it('폴더 이동이면 그 아래 전부를 접두어째로 옮긴다', () => {
    const { tabsModel, viewModel } = make();
    tabsModel.setTree({
      kind: 'leaf',
      id: ROOT_PANE_ID,
      tabs: [
        { id: 'old/a.md', kind: 'file', title: 'a.md' },
        { id: 'old/nested/b.md', kind: 'file', title: 'b.md' },
        { id: 'unrelated.md', kind: 'file', title: 'unrelated.md' },
      ],
      activeTabId: 'old/a.md',
    });

    viewModel.retargetTabs('old', 'new');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['new/a.md', 'new/nested/b.md', 'unrelated.md']);
  });

  it('겹치는 접두어를 가진 다른 파일은 건드리지 않는다 — old.txt 는 old 의 하위가 아니다', () => {
    const { viewModel } = make();
    viewModel.previewFile('old.txt');

    viewModel.retargetTabs('old', 'new');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['old.txt']);
  });

  it('활성 탭·미리보기 탭도 같이 따라간다', () => {
    const { viewModel } = make();
    viewModel.previewFile('old.txt');

    viewModel.retargetTabs('old.txt', 'new.txt');

    const leaf = activeLeafOf(viewModel);
    expect(leaf.activeTabId).toBe('new.txt');
    expect(leaf.tabs[0]?.isPreview).toBe(true);
  });

  it('해당하는 탭이 없으면 아무것도 바뀌지 않는다', () => {
    const { viewModel } = make();
    viewModel.previewFile('a.md');

    viewModel.retargetTabs('nope', 'new');

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a.md']);
  });
});

/**
 * `window.confirm` 대신이다(2026-09-04) — 무엇이 더러운지는 `ITabDirtyState`가 알고, ViewModel은
 * 그 답을 물어 확인 흐름만 관리한다. 셸은 파일이라는 개념을 모른다.
 */
describe('requestCloseTab / confirmCloseTab / cancelCloseTab', () => {
  it('dirty가 아니면 바로 닫는다 — 확인을 구하지 않는다', () => {
    const { viewModel } = make();
    viewModel.previewFile('a.md');
    viewModel.pinTab('a.md');

    viewModel.requestCloseTab(ROOT_PANE_ID, 'a.md');

    expect(viewModel.pendingTabClose).toBeNull();
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([]);
  });

  it('dirty면 즉시 닫지 않고 확인 대상을 담아 둔다', () => {
    const { viewModel, tabDirtyState } = make();
    viewModel.previewFile('a.md');
    viewModel.pinTab('a.md');
    tabDirtyState.dirty.add('a.md');

    viewModel.requestCloseTab(ROOT_PANE_ID, 'a.md');

    expect(viewModel.pendingTabClose).toEqual({ leafId: ROOT_PANE_ID, tabId: 'a.md' });
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a.md']);
  });

  it('confirmCloseTab은 담아 둔 대상을 실제로 닫고 비운다', () => {
    const { viewModel, tabDirtyState } = make();
    viewModel.previewFile('a.md');
    viewModel.pinTab('a.md');
    tabDirtyState.dirty.add('a.md');
    viewModel.requestCloseTab(ROOT_PANE_ID, 'a.md');

    viewModel.confirmCloseTab();

    expect(viewModel.pendingTabClose).toBeNull();
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([]);
  });

  it('cancelCloseTab은 닫지 않고 비운다', () => {
    const { viewModel, tabDirtyState } = make();
    viewModel.previewFile('a.md');
    viewModel.pinTab('a.md');
    tabDirtyState.dirty.add('a.md');
    viewModel.requestCloseTab(ROOT_PANE_ID, 'a.md');

    viewModel.cancelCloseTab();

    expect(viewModel.pendingTabClose).toBeNull();
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['a.md']);
  });

  it('confirmCloseTab은 담아 둔 것이 없으면 아무 일도 하지 않는다', () => {
    const { viewModel } = make();

    expect(() => viewModel.confirmCloseTab()).not.toThrow();
    expect(viewModel.pendingTabClose).toBeNull();
  });
});

/**
 * `useViewModel`이 Shell 마운트에 자동으로 거는 생명주기 — 파일 감시를 `IFileContentViewModel`에
 * 직접 얹지 않고 여기 얹는 이유(탭 단위가 아니라 앱 전체 단위)는 `ShellViewModel`의 필드
 * 주석 참고.
 */
describe('onMount / onDispose — 파일 감시 생명주기 위임', () => {
  it('onMount는 등록된 시작 작업을 켠다', () => {
    const { viewModel, startup } = make();

    viewModel.onMount();

    expect(startup.started).toBe(true);
  });

  it('onDispose는 감시를 멈춘다', () => {
    const { viewModel, startup } = make();
    viewModel.onMount();

    viewModel.onDispose();

    expect(startup.started).toBe(false);
  });
});

describe('IShellViewModel — 낡은 클라이언트', () => {
  const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('서버 프로토콜 버전이 다르면 낡았다고 표시한다', async () => {
    const { viewModel } = make({ load: () => Promise.resolve({ builtAt: '2026-09-09T00:00:00.000Z', protocolVersion: 999, workspaceName: 'ws' }) });
    viewModel.onMount?.();
    await settled();
    expect(viewModel.isClientOutdated).toBe(true);
    expect(viewModel.buildId).not.toBe('');
    expect(viewModel.workspaceName).toBe('ws');
  });

  it('같으면 낡지 않았다', async () => {
    const { viewModel } = make({ load: () => Promise.resolve({ builtAt: '2026-09-09T00:00:00.000Z', protocolVersion: 1, workspaceName: 'ws' }) });
    viewModel.onMount?.();
    await settled();
    expect(viewModel.isClientOutdated).toBe(false);
  });

  it('서버 정보를 못 읽으면 낡지 않은 것으로 둔다 — 진단이 기능을 막지 않는다', async () => {
    const { viewModel } = make();
    viewModel.onMount?.();
    await settled();
    expect(viewModel.isClientOutdated).toBe(false);
    expect(viewModel.buildId).toBe('');
  });
});

describe('IShellViewModel — openTab', () => {
  it('파일이 아닌 탭을 고정으로 열고 활성으로 만든다', () => {
    const { viewModel } = make();
    viewModel.openTab({ id: 'chat-1', kind: 'chat', title: '대화' });
    const leaf = activeLeafOf(viewModel);
    expect(leaf.tabs).toEqual([{ id: 'chat-1', kind: 'chat', title: '대화', isPreview: false, isDirty: false }]);
    expect(leaf.activeTabId).toBe('chat-1');
  });

  it('이미 열려 있으면 그 탭으로 갈 뿐 복제하지 않는다', () => {
    const { viewModel } = make();
    viewModel.openTab({ id: 'chat-1', kind: 'chat', title: '대화' });
    viewModel.previewFile('a.md');
    viewModel.openTab({ id: 'chat-1', kind: 'chat', title: '대화' });
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(['chat-1', 'a.md']);
    expect(activeLeafOf(viewModel).activeTabId).toBe('chat-1');
  });
});

describe('IShellViewModel — 알림', () => {
  it('알림 서비스의 것을 그대로 내고, 닫으면 사라진다', () => {
    const { viewModel, notificationService } = make();
    notificationService.notify('error', '실패');
    expect(viewModel.notifications).toEqual([{ id: 'n', severity: 'error', message: '실패' }]);
    viewModel.dismissNotification('n');
    expect(viewModel.notifications).toEqual([]);
  });
});

describe('IShellViewModel — 위치 요청', () => {
  it('위치와 함께 열면 reveal이 그 탭을 가리키고 요청마다 seq가 오른다', () => {
    const { viewModel } = make();
    expect(viewModel.reveal).toBeNull();
    viewModel.previewFile('a.md', { line: 3, column: 2 });
    expect(viewModel.reveal).toEqual({ tabId: 'a.md', line: 3, column: 2, seq: 1 });
    viewModel.previewFile('a.md', { line: 3, column: 2 });
    expect(viewModel.reveal?.seq).toBe(2);
    viewModel.previewFile('b.md');
    expect(viewModel.reveal?.tabId).toBe('a.md');
  });
});

describe('IShellViewModel — showActivity', () => {
  it('같은 활동을 다시 켜도 끄지 않고 드로어를 연다', () => {
    const { viewModel } = make();
    viewModel.showActivity('explorer');
    viewModel.showActivity('explorer');
    expect(activeIds(viewModel)).toEqual(['explorer']);
    expect(viewModel.isSidebarOpen).toBe(true);
  });
});

describe('IShellViewModel — activeTab', () => {
  it('활성 leaf의 활성 탭을 준다', () => {
    const { viewModel } = make();
    expect(viewModel.activeTab).toBeNull();
    viewModel.previewFile('a.md');
    expect(viewModel.activeTab).toEqual({ id: 'a.md', kind: 'file' });
  });
});
