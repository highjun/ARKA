import { useState } from "react";
import { CommandService } from "#core/commands";
import { Container } from "#core/di";
import { ContainerProvider } from "#core/viewmodel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#ui/Icon";
import { isNarrowViewport } from "#lib/story";
import { Text } from "#ui/Text";
import type { IAppStatusViewModel } from "../viewmodel/IAppStatusViewModel";
import type { ICommandPaletteViewModel } from "../viewmodel/ICommandPaletteViewModel";
import type { INotificationViewModel } from "../viewmodel/INotificationViewModel";
import type { IShellViewModel } from "../viewmodel/IShellViewModel";
import type { ITabSystemViewModel, PaneRowNode, TabRow } from "../viewmodel/ITabSystemViewModel";
import { ShellView } from "./ShellView";

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

const shellViewModel = (state: Partial<IShellViewModel>): IShellViewModel => ({
  dispose: () => undefined,
  sidebars: [
    { id: "explorer", title: "탐색기", iconId: "files", Content: panel("탐색기") },
    { id: "search", title: "검색", iconId: "search", Content: panel("검색") },
  ],
  activeSidebarId: "explorer",
  toggleSidebar: () => undefined,
  revealSidebar: () => undefined,
  toggleSidebarExpanded: () => undefined,
  bottoms: [],
  activeBottom: null,
  toggleBottom: () => undefined,
  toggleBottomOpen: () => undefined,
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
  moveTab: () => undefined,
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
  unreadCount: 0,
  toasts: [],
  dismiss: () => undefined,
  dismissToast: () => undefined,
  markRead: () => undefined,
  clear: () => undefined,
  ...state,
});

const appStatusViewModel = (state: Partial<IAppStatusViewModel>): IAppStatusViewModel => ({
  dispose: () => undefined,
  workspaceName: "ARKA",
  builtAt: "2026-09-20 11:18",
  gitSha: "ab90700",
  isOutdated: false,
  isUpdateAvailable: false,
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
  keybinding: "ctrl+k",
  run: () => undefined,
  ...state,
});

const meta = {
  title: "01-workbench/ShellView",
  component: ShellView,
} satisfies Meta<typeof ShellView>;

export default meta;
type Story = StoryObj<typeof meta>;

type Fixture = {
  readonly shell?: Partial<IShellViewModel>;
  readonly tabs?: Partial<ITabSystemViewModel>;
  readonly notifications?: Partial<INotificationViewModel>;
  readonly appStatus?: Partial<IAppStatusViewModel>;
  readonly palette?: Partial<ICommandPaletteViewModel>;
};

const story = (fixture: Fixture): Story => ({
  decorators: [
    (Story, { globals }) => {
      const [activeSidebarId, setActiveSidebarId] = useState<string | null>("explorer");
      const [isSidebarOpen, setSidebarOpen] = useState(true);
      const narrow = isNarrowViewport(globals);
      const container = new Container("story");
      container.register("arka.workbench.shellViewModel", "singleton", () =>
        shellViewModel({
          isNarrow: narrow,
          activeSidebarId,
          isSidebarOpen,
          setSidebarOpen,
          /** 좁은 화면에는 접힘이 없다 — ShellViewModel 의 규칙을 스토리에서도 같은 꼴로 흉내 낸다. */
          toggleSidebar: (id) => setActiveSidebarId((current) => (current === id && !narrow ? null : id)),
          toggleSidebarExpanded: () => setActiveSidebarId((current) => (current === null ? "explorer" : null)),
          ...fixture.shell,
        }),
      );
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
