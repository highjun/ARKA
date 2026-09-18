import { CommandService } from "#core/commands";
import { Container } from "#core/di";
import { ContainerProvider } from "#core/viewmodel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "#component/Text";
import { SidebarContentRegistry } from "../model/SidebarContentRegistry";
import { TabContentRegistry } from "../model/TabContentRegistry";
import type { IShellViewModel, ShellTabPaneNode } from "../viewmodel/IShellViewModel";
import { ShellView } from "./ShellView";

/**
 * 셸은 "무엇이 꽂혔는지"를 두 레지스트리로만 안다. 그래서 스토리도 **진짜 레지스트리**에 자리
 * 표시 컴포넌트를 등록한다 — 여기서 볼 것은 사이드바·탭·분할이 실제로 맞물리는 모양이고, 그
 * 조회 경로를 흉내로 바꾸면 정작 보려던 것이 사라진다. 반대로 ViewModel은 고정된 값을 준다.
 */
const panel = (label: string) => () => <Text>{label} 패널</Text>;
const tab = (label: string) => () => <Text>{label} 탭의 내용</Text>;

const registries = () => {
  const sidebar = new SidebarContentRegistry();
  sidebar.add({ id: "explorer", ContentComponent: panel("탐색기") });
  sidebar.add({ id: "search", ContentComponent: panel("검색") });
  const tabs = new TabContentRegistry();
  tabs.add({ id: "file", iconId: "file", TabComponent: tab("파일") });
  tabs.add({ id: "chat", iconId: "brain", TabComponent: tab("대화") });
  return { sidebar, tabs };
};

const ONE_PANE: ShellTabPaneNode = {
  kind: "leaf",
  id: "leaf-1",
  activeTabId: "src/main.tsx",
  tabs: [
    { id: "src/main.tsx", kind: "file", title: "main.tsx", isPreview: false, isDirty: false },
    { id: "CONVENTIONS.md", kind: "file", title: "CONVENTIONS.md", isPreview: false, isDirty: true },
    { id: "chat:1", kind: "chat", title: "빌드 실패 분석", isPreview: true, isDirty: false },
  ],
};

const SPLIT: ShellTabPaneNode = {
  kind: "split",
  id: "root",
  orientation: "horizontal",
  children: [
    ONE_PANE,
    {
      kind: "leaf",
      id: "leaf-2",
      activeTabId: "chat:1",
      tabs: [{ id: "chat:1", kind: "chat", title: "빌드 실패 분석", isPreview: false, isDirty: false }],
    },
  ],
};

const viewModel = (state: Partial<IShellViewModel>): IShellViewModel => ({
  dispose: () => undefined,
  activities: [
    { id: "explorer", title: "탐색기", iconId: "files", isActive: true },
    { id: "search", title: "검색", iconId: "search", isActive: false },
  ],
  tree: ONE_PANE,
  activeLeafId: "leaf-1",
  activeTab: { id: "src/main.tsx", kind: "file" },
  selectActivity: () => undefined,
  selectTab: () => undefined,
  closeTab: () => undefined,
  pendingTabClose: null,
  requestCloseTab: () => undefined,
  confirmCloseTab: () => undefined,
  cancelCloseTab: () => undefined,
  closeOtherTabs: () => undefined,
  closeTabsToRight: () => undefined,
  reorderTabs: () => undefined,
  splitTab: () => undefined,
  resizeNode: () => undefined,
  retargetTabs: () => undefined,
  previewFile: () => undefined,
  reveal: null,
  openTab: () => undefined,
  pinTab: () => undefined,
  buildId: "ab90700",
  workspaceName: "ARKASHIC",
  isClientOutdated: false,
  reloadApp: () => undefined,
  notifications: [],
  dismissNotification: () => undefined,
  theme: "light",
  toggleTheme: () => undefined,
  showActivity: () => undefined,
  isSidebarOpen: true,
  setSidebarOpen: () => undefined,
  isPaletteOpen: false,
  setPaletteOpen: () => undefined,
  ...state,
});

const meta = {
  title: "workbench/ShellView",
  component: ShellView,
} satisfies Meta<typeof ShellView>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (state: Partial<IShellViewModel>): Story => ({
  decorators: [
    (Story) => {
      const { sidebar, tabs } = registries();
      const container = new Container("story");
      container.register("arka.workbench.shellViewModel", "singleton", () => viewModel(state));
      container.register("arka.workbench.sidebarContentRegistry", "singleton", () => sidebar);
      container.register("arka.workbench.tabContentRegistry", "singleton", () => tabs);
      container.register(
        "arka.commands",
        "singleton",
        () =>
          new CommandService({
            overridesStore: { load: () => ({}), save: () => undefined },
            reportError: () => undefined,
          }),
      );
      return (
        <ContainerProvider container={container.createChild("view")}>
          <div style={{ height: 640, width: 1100 }}>
            <Story />
          </div>
        </ContainerProvider>
      );
    },
  ],
});

export const Default: Story = story({});

/** 탭이 하나도 없을 때 — 셸의 뼈대만 남는다. */
export const Empty: Story = story({
  tree: { kind: "leaf", id: "leaf-1", activeTabId: null, tabs: [] },
  activeTab: null,
});

/** 좌우로 나뉜 pane 둘 — 이 조합은 컴포넌트 스토리로는 볼 수 없다. */
export const Split: Story = story({ tree: SPLIT, activeLeafId: "leaf-2" });

/** 알림이 쌓인 상태. */
export const Notifications: Story = story({
  notifications: [
    { id: "1", severity: "error", message: "파일을 저장하지 못했다 — EACCES" },
    { id: "2", severity: "warning", message: "연결이 불안정하다" },
  ],
});

/** 서버 프로토콜 버전이 달라 캐시된 클라이언트가 낡았다 — 다시 불러오기를 권하는 띠가 뜬다. */
export const Outdated: Story = story({ isClientOutdated: true });

/** 저장 안 된 탭을 닫으려 할 때의 확인. */
export const ConfirmClose: Story = story({ pendingTabClose: { leafId: "leaf-1", tabId: "CONVENTIONS.md" } });

/** 커맨드 팔레트가 열린 상태. */
export const PaletteOpen: Story = story({ isPaletteOpen: true });

/** 모바일에서 드로어가 닫힌 상태 — 사이드바가 밀려 나간다. */
export const SidebarClosed: Story = story({ isSidebarOpen: false });
