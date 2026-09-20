import { CommandService } from "#core/commands";
import { Container } from "#core/di";
import { ContainerProvider } from "#core/viewmodel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { Text } from "#component/Text";
import type { IAppStatusViewModel } from "../viewmodel/IAppStatusViewModel";
import type { ICommandPaletteViewModel } from "../viewmodel/ICommandPaletteViewModel";
import type { INotificationViewModel } from "../viewmodel/INotificationViewModel";
import type { IShellViewModel } from "../viewmodel/IShellViewModel";
import type { ITabSystemViewModel, PaneRowNode, TabRow } from "../viewmodel/ITabSystemViewModel";
import { ShellView } from "./ShellView";

/**
 * 셸은 ViewModel 다섯이 준 값을 그릴 뿐이다 — 스토리는 그 값을 고정해서 준다. 여기서 볼 것은 사이드바·탭·분할이
 * 실제로 맞물리는 모양이다.
 */
const panel = (label: string) => () => <Text>{label} 패널</Text>;
const tab = (label: string) => () => <Text>{label} 탭의 내용</Text>;

const row = (id: string, title: string, extra: Partial<TabRow> = {}): TabRow => ({
  id,
  kind: "file",
  title,
  icon: <Icon iconId="file" size="sm" />,
  Content: tab(title),
  isPreview: false,
  isDirty: false,
  ...extra,
});

const ONE_PANE: PaneRowNode = {
  kind: "leaf",
  id: "leaf-1",
  activeTabId: "file:///src/main.tsx",
  tabs: [
    row("file:///src/main.tsx", "main.tsx"),
    row("file:///CONVENTIONS.md", "CONVENTIONS.md", { isDirty: true }),
    row("chat:///1", "빌드 실패 분석", { kind: "chat", icon: <Icon iconId="brain" size="sm" />, isPreview: true }),
  ],
};

const SPLIT: PaneRowNode = {
  kind: "split",
  id: "root",
  orientation: "horizontal",
  children: [
    ONE_PANE,
    {
      kind: "leaf",
      id: "leaf-2",
      activeTabId: "chat:///1",
      tabs: [row("chat:///1", "빌드 실패 분석", { kind: "chat", icon: <Icon iconId="brain" size="sm" /> })],
    },
  ],
};

const shellViewModel = (state: Partial<IShellViewModel>): IShellViewModel => ({
  dispose: () => undefined,
  sidebars: [
    { id: "explorer", title: "탐색기", iconId: "files" },
    { id: "search", title: "검색", iconId: "search" },
  ],
  activeSidebarId: "explorer",
  activeSidebar: { id: "explorer", title: "탐색기", Content: panel("탐색기"), actions: [] },
  toggleSidebar: () => undefined,
  revealSidebar: () => undefined,
  bottoms: [],
  activeBottom: null,
  toggleBottom: () => undefined,
  isNarrow: false,
  colorMode: "light",
  toggleColorMode: () => undefined,
  isSidebarOpen: true,
  setSidebarOpen: () => undefined,
  ...state,
});

const tabSystemViewModel = (state: Partial<ITabSystemViewModel>, container: Container): ITabSystemViewModel => ({
  dispose: () => undefined,
  tree: ONE_PANE,
  activePaneId: "leaf-1",
  activeTab: { id: "file:///src/main.tsx", kind: "file" },
  selectTab: () => undefined,
  closeTab: () => undefined,
  requestCloseTab: () => undefined,
  pendingClose: null,
  confirmClose: () => undefined,
  cancelClose: () => undefined,
  closeOthers: () => undefined,
  closeToRight: () => undefined,
  reorderTabs: () => undefined,
  splitTab: () => undefined,
  resizePane: () => undefined,
  pinTab: () => undefined,
  retargetTabs: () => undefined,
  containerOf: () => container,
  ...state,
});

const notificationViewModel = (state: Partial<INotificationViewModel>): INotificationViewModel => ({
  dispose: () => undefined,
  items: [],
  dismiss: () => undefined,
  ...state,
});

const appStatusViewModel = (state: Partial<IAppStatusViewModel>): IAppStatusViewModel => ({
  dispose: () => undefined,
  workspaceName: "ARKASHIC",
  buildId: "ab90700",
  isOutdated: false,
  reload: () => undefined,
  ...state,
});

const paletteViewModel = (state: Partial<ICommandPaletteViewModel>): ICommandPaletteViewModel => ({
  dispose: () => undefined,
  isOpen: false,
  open: () => undefined,
  close: () => undefined,
  query: "",
  setQuery: () => undefined,
  rows: [
    { id: "shell.openSettings", label: "설정 열기", keybinding: "ctrl+," },
    { id: "shell.toggleTheme", label: "테마 전환", keybinding: "ctrl+j" },
  ],
  run: () => undefined,
  ...state,
});

const meta = {
  title: "01-workbench/ShellView",
  component: ShellView,
} satisfies Meta<typeof ShellView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ViewModel 다섯의 일부만 바꾼다 — 나머지는 기본값이다. */
type Fixture = {
  readonly shell?: Partial<IShellViewModel>;
  readonly tabs?: Partial<ITabSystemViewModel>;
  readonly notifications?: Partial<INotificationViewModel>;
  readonly appStatus?: Partial<IAppStatusViewModel>;
  readonly palette?: Partial<ICommandPaletteViewModel>;
};

const story = (fixture: Fixture): Story => ({
  decorators: [
    (Story) => {
      const container = new Container("story");
      container.register("arka.workbench.shellViewModel", "singleton", () => shellViewModel(fixture.shell ?? {}));
      container.register("arka.workbench.tabSystemViewModel", "singleton", () =>
        tabSystemViewModel(fixture.tabs ?? {}, container),
      );
      container.register("arka.workbench.notificationViewModel", "singleton", () =>
        notificationViewModel(fixture.notifications ?? {}),
      );
      container.register("arka.workbench.appStatusViewModel", "singleton", () =>
        appStatusViewModel(fixture.appStatus ?? {}),
      );
      container.register("arka.workbench.commandPaletteViewModel", "singleton", () =>
        paletteViewModel(fixture.palette ?? {}),
      );
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
  tabs: { tree: { kind: "leaf", id: "leaf-1", activeTabId: null, tabs: [] }, activeTab: null },
});

/** 좌우로 나뉜 pane 둘 — 이 조합은 컴포넌트 스토리로는 볼 수 없다. */
export const Split: Story = story({ tabs: { tree: SPLIT, activePaneId: "leaf-2" } });

/** 알림이 쌓인 상태. */
export const Notifications: Story = story({
  notifications: {
    items: [
      { id: "1", severity: "error", message: "파일을 저장하지 못했다 — EACCES" },
      { id: "2", severity: "warning", message: "연결이 불안정하다" },
    ],
  },
});

/** 서버 프로토콜 버전이 달라 캐시된 클라이언트가 낡았다 — 다시 불러오기를 권하는 띠가 뜬다. */
export const Outdated: Story = story({ appStatus: { isOutdated: true } });

/** 저장 안 된 탭을 닫으려 할 때의 확인. */
export const ConfirmClose: Story = story({
  tabs: { pendingClose: { paneId: "leaf-1", tabId: "file:///CONVENTIONS.md" } },
});

/** 커맨드 팔레트가 열린 상태. */
export const PaletteOpen: Story = story({ palette: { isOpen: true } });

/** 모바일에서 드로어가 닫힌 상태 — 사이드바가 밀려 나간다. */
export const SidebarClosed: Story = story({ shell: { isSidebarOpen: false } });
