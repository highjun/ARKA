import { CommandCenterRegistry, CommandCenterRegistryToken } from "#core/commands";
import { createContainer, createToken, scoped, singleton, type Container } from "#core/di";
import {
  DirectoryTreeModel,
  DirectoryTreeModelToken,
  DirectoryTreeViewModel,
  DirectoryTreeViewModelToken,
  FileContentModel,
  FileContentModelToken,
  FileContentViewModel,
  FileContentViewModelToken,
  PinTabToken,
  WorkspaceFilesToken,
  WorkspaceWatchToken,
} from "../extensions/filesystem";
import {
  AgentApiToken,
  AgentEventsToken,
  CHAT_TAB_KIND,
  ChatModel,
  ChatModelToken,
  ChatViewModel,
  ChatViewModelToken,
} from "../extensions/agent";
import { createAgentApiPort } from "../extensions/agent/infra/HttpAgentApi";
import { createAgentEventsPort } from "../extensions/agent/infra/SseAgentEvents";
import { ChatSessionsView } from "../extensions/agent/view/ChatSessionsView";
import { ChatTabView } from "../extensions/agent/view/ChatTabView";
import { DIFF_TAB_KIND, GitModel, GitModelToken, GitServiceToken, SourceControlViewModel, SourceControlViewModelToken } from "../extensions/git";
import { createGitServicePort } from "../extensions/git/infra/HttpGitService";
import { DiffTabView } from "../extensions/git/view/DiffTabView";
import { SourceControlView } from "../extensions/git/view/SourceControlView";
import {
  MarkdownPreviewModel,
  MarkdownPreviewModelToken,
  MarkdownPreviewViewModel,
  MarkdownPreviewViewModelToken,
  MarkdownSourceToken,
  PREVIEW_TAB_KIND,
} from "../extensions/markdown";
import { MarkdownPreviewTabView } from "../extensions/markdown/view/MarkdownPreviewTabView";
import { SearchModel, SearchModelToken, SearchServiceToken, SearchViewModel, SearchViewModelToken } from "../extensions/search";
import { createSearchServicePort } from "../extensions/search/infra/HttpSearchService";
import { SearchView } from "../extensions/search/view/SearchView";
import { createWorkspaceMarkdownSource } from "../extensions/markdown/infra/WorkspaceMarkdownSource";
import { createWorkspaceFilesPort } from "../extensions/filesystem/infra/HttpWorkspaceFiles";
import { createWorkspaceWatchPort } from "../extensions/filesystem/infra/HttpWorkspaceWatch";
import { DirectoryTreeView } from "../extensions/filesystem/view/DirectoryTreeView";
import { FileContentView } from "../extensions/filesystem/view/FileContentView";
import { createDocumentDensity } from "./infra/DocumentDensity";
import { createDocumentTheme } from "./infra/DocumentTheme";
import { createErrorNotifier } from "./infra/ErrorNotifier";
import { createGlobalErrorHandlers } from "./infra/GlobalErrorHandlers";
import { createGlobalKeybindings } from "./infra/GlobalKeybindings";
import { createServerInfoPort } from "./infra/HttpServerInfo";
import { createUnloadGuard } from "./infra/UnloadGuard";
import { createStoragePort } from "./infra/LocalStorage";
import { KeybindingsTabView } from "./view/KeybindingsTabView";
import { SettingsTabView } from "./view/SettingsTabView";
import { SettingsModel } from "./model/SettingsModel";
import { SettingsModelToken } from "./model/ISettingsModel";
import { SettingsViewModel } from "./viewmodel/SettingsViewModel";
import { SettingsViewModelToken } from "./viewmodel/ISettingsViewModel";
import { WorkbenchStartupRegistry } from "./model/WorkbenchStartupRegistry";
import { ActivityBarRegistry } from "./model/ActivityBarRegistry";
import { ActivityModel } from "./model/ActivityModel";
import { ErrorLog } from "./model/ErrorLog";
import { ErrorLogToken } from "./model/IErrorLog";
import { NotificationService } from "./model/NotificationService";
import { NotificationServiceToken } from "./model/INotificationService";
import { SidebarContentRegistry } from "./model/SidebarContentRegistry";
import { TabContentRegistry } from "./model/TabContentRegistry";
import { TabsModel } from "./model/TabsModel";
import { ThemeModel } from "./model/ThemeModel";
import { ShellViewModel } from "./viewmodel/ShellViewModel";
import { ActivityBarRegistryToken } from "./model/IActivityBarRegistry";
import { ServerInfoToken } from "./model/IServerInfo";
import { ActivityModelToken } from "./model/IActivityModel";
import { SidebarContentRegistryToken } from "./model/ISidebarContentRegistry";
import { StorageToken } from "./model/IStorage";
import { TabContentRegistryToken } from "./model/ITabContentRegistry";
import { TabDirtyStateToken } from "./model/ITabDirtyState";
import { TabsModelToken } from "./model/ITabsModel";
import { ThemeModelToken } from "./model/IThemeModel";
import { WorkbenchStartupRegistryToken, type IWorkbenchStartup } from "./model/IWorkbenchStartup";
import { ShellViewModelToken } from "./viewmodel/IShellViewModel";

/** 셸 수명주기에 얹는 기여들. 조립부만 아는 것이라 여기서 만든다. */
const FileWatchStartupToken = createToken<IWorkbenchStartup>("startup.fileWatch");
const DocumentThemeToken = createToken<IWorkbenchStartup>("startup.documentTheme");
const DocumentDensityToken = createToken<IWorkbenchStartup>("startup.documentDensity");
const UnloadGuardToken = createToken<IWorkbenchStartup>("startup.unloadGuard");
const GlobalKeybindingsToken = createToken<IWorkbenchStartup>("startup.globalKeybindings");
const GlobalErrorHandlersToken = createToken<IWorkbenchStartup>("startup.globalErrorHandlers");
const ErrorNotifierToken = createToken<IWorkbenchStartup>("startup.errorNotifier");
/** 익스텐션의 커맨드는 그 ViewModel이 만들어질 때 등록된다 — 탭이 뜨기 전에도 팔레트에 있어야 하므로 셸이 뜰 때 만들어 둔다(VSCode의 activation). */
const MarkdownActivationToken = createToken<IWorkbenchStartup>("startup.markdown");
/** 위 다섯을 합친 것 — `ShellViewModel`이 이것 하나만 받는다. */
const WorkbenchStartupToken = createToken<IWorkbenchStartup>("workbenchStartup");

/** 탐색기 활동의 id. ActivityBar·SidebarContent 등록 둘 다 이 문자열로 서로를 잇는다. */
const EXPLORER_ID = "explorer";
/** 에이전트 활동의 id. */
const AGENT_ID = "agent";
/** 검색 활동의 id. */
const SEARCH_ID = "search";
/** 소스 제어 활동의 id. */
const SCM_ID = "scm";
/** 파일 탭의 kind. `IShellViewModel.previewFile`이 여는 탭의 kind와 같아야 TabContent가 찾는다. */
const FILE_TAB_KIND = "file";

/**
 * 조립은 여기 한 곳이다. 이 파일만 읽으면 무엇이 도는지 다 보인다.
 *
 * Shell의 확장 지점(ActivityBar·SidebarContent·TabContent)도 여기서 채운다 — filesystem이
 * shell 타입을 거꾸로 import하는 순환을 피하기 위해서다(지금은 shell → filesystem 단방향).
 */
export function createApplication(): Container {
  const container = createContainer("app");

  // 브라우저 API를 얇은 함수로 감싸 넣는다 — Model·ViewModel이 navigator·document를 직접
  // 알면 테스트가 DOM에 묶인다.
  const copyToClipboard = (text: string): void => {
    void navigator.clipboard.writeText(text);
  };
  const reloadApp = (): void => {
    location.reload();
  };
  const isTypingSurface = (): boolean => {
    const active = document.activeElement;
    if (active === null) return false;
    if (active.tagName === "INPUT" || active.tagName === "TEXTAREA") return true;
    return (active as HTMLElement).isContentEditable;
  };

  container.register(WorkspaceFilesToken, singleton(createWorkspaceFilesPort));
  container.register(WorkspaceWatchToken, singleton(createWorkspaceWatchPort));
  container.register(SearchServiceToken, singleton(createSearchServicePort));
  container.register(GitServiceToken, singleton(createGitServicePort));
  container.register(AgentApiToken, singleton(createAgentApiPort));
  container.register(AgentEventsToken, singleton(createAgentEventsPort));
  container.register(StorageToken, singleton(createStoragePort));
  container.register(ServerInfoToken, singleton(createServerInfoPort));
  container.register(CommandCenterRegistryToken, singleton(() => new CommandCenterRegistry()));
  container.register(ActivityBarRegistryToken, singleton(() => new ActivityBarRegistry()));
  container.register(SidebarContentRegistryToken, singleton(() => new SidebarContentRegistry()));
  container.register(TabContentRegistryToken, singleton(() => new TabContentRegistry()));
  container.register(WorkbenchStartupRegistryToken, singleton(() => new WorkbenchStartupRegistry()));

  container.register(ErrorLogToken, singleton(() => new ErrorLog()));
  container.register(NotificationServiceToken, singleton(() => new NotificationService()));
  container.register(ActivityModelToken, singleton(() => new ActivityModel()));
  container.register(
    TabsModelToken,
    singleton((c) => new TabsModel({ storage: c.resolve(StorageToken) })),
  );
  container.register(
    ThemeModelToken,
    singleton((c) => new ThemeModel({ storage: c.resolve(StorageToken) })),
  );
  container.register(SettingsModelToken, singleton((c) => new SettingsModel({ storage: c.resolve(StorageToken) })));
  container.register(
    SettingsViewModelToken,
    scoped((c) => new SettingsViewModel({ themeModel: c.resolve(ThemeModelToken), settingsModel: c.resolve(SettingsModelToken) })),
  );
  container.register(
    DirectoryTreeModelToken,
    singleton(
      (c) =>
        new DirectoryTreeModel({
          workspaceFiles: c.resolve(WorkspaceFilesToken),
          workspaceWatch: c.resolve(WorkspaceWatchToken),
        }),
    ),
  );
  container.register(
    FileContentModelToken,
    singleton(
      (c) =>
        new FileContentModel({
          workspaceFiles: c.resolve(WorkspaceFilesToken),
          workspaceWatch: c.resolve(WorkspaceWatchToken),
        }),
    ),
  );

  container.register(
    ChatModelToken,
    singleton(
      (c) =>
        new ChatModel({
          api: c.resolve(AgentApiToken),
          events: c.resolve(AgentEventsToken),
          // 설정은 workbench의 것이다 — agent는 모르고, 조립부가 함수로 넘긴다.
          confirmWrites: () => c.resolve(SettingsModelToken).settings.agentConfirmWrites,
        }),
    ),
  );

  // ViewModel은 scoped다 — 화면 하나가 사는 동안만 유지되고, 그 스코프를 dispose하면
  // 구독까지 함께 정리된다.
  container.register(ChatViewModelToken, scoped((c) => new ChatViewModel({ chatModel: c.resolve(ChatModelToken) })));
  container.register(SearchModelToken, singleton((c) => new SearchModel({ searchService: c.resolve(SearchServiceToken) })));
  container.register(SearchViewModelToken, scoped((c) => new SearchViewModel({ searchModel: c.resolve(SearchModelToken) })));
  container.register(GitModelToken, singleton((c) => new GitModel({ gitService: c.resolve(GitServiceToken) })));
  // markdown은 filesystem을 모른다 — 두 포트를 markdown이 바라는 모양으로 감싸는 어댑터에 넘기는
  // 것까지가 조립부의 일이다. 감싸는 방법 자체는 markdown의 infra가 안다.
  container.register(
    MarkdownSourceToken,
    singleton((c) =>
      createWorkspaceMarkdownSource({ files: c.resolve(WorkspaceFilesToken), watch: c.resolve(WorkspaceWatchToken) }),
    ),
  );
  container.register(MarkdownPreviewModelToken, singleton((c) => new MarkdownPreviewModel({ source: c.resolve(MarkdownSourceToken) })));
  container.register(SourceControlViewModelToken, scoped((c) => new SourceControlViewModel({ gitModel: c.resolve(GitModelToken) })));
  container.register(
    MarkdownPreviewViewModelToken,
    scoped(
      (c) =>
        new MarkdownPreviewViewModel({
          previewModel: c.resolve(MarkdownPreviewModelToken),
          commandCenterRegistry: c.resolve(CommandCenterRegistryToken),
          activeFile: () => {
            const active = c.resolve(ShellViewModelToken).activeTab;
            return active !== null && active.kind === FILE_TAB_KIND ? active.id : null;
          },
          openTab: (tab) => c.resolve(ShellViewModelToken).openTab(tab),
        }),
    ),
  );
  container.register(
    DirectoryTreeViewModelToken,
    scoped(
      (c) =>
        new DirectoryTreeViewModel({
          directoryTreeModel: c.resolve(DirectoryTreeModelToken),
          commandCenterRegistry: c.resolve(CommandCenterRegistryToken),
          copyToClipboard,
          isTypingSurface,
        }),
    ),
  );
  // filesystem은 shell을 모른다 — 탭 고정이라는 "무엇"만 계약으로 알고, 그게 ShellViewModel
  // 이라는 "누구"는 이 조립부만 안다.
  container.register(
    PinTabToken,
    scoped((c) => ({ pin: (path: string) => c.resolve(ShellViewModelToken).pinTab(path) })),
  );
  // 셸은 "이 탭이 dirty인가"라는 계약만 알고, 그게 filesystem이라는 것은 이 조립부만 안다
  // — `PinTabToken`을 뒤집은 모양이다. 스코프에서 resolve해야 View가 보는 것과 같은 인스턴스다.
  container.register(
    TabDirtyStateToken,
    scoped((c) => ({
      isDirty: (tabId: string) =>
        c.resolve(FileContentViewModelToken).rows[tabId]?.isDirty ?? false,
      hasAnyDirty: () =>
        Object.values(c.resolve(FileContentViewModelToken).rows).some((row) => row.isDirty),
      onDidChange: (listener: () => void) =>
        c.resolve(FileContentViewModelToken).onDidChange(listener),
    })),
  );
  // 셸이 뜨고 질 때 켜고 끌 것들. 셸은 무엇이 켜지는지 모르고 목록만 받는다.
  container.register(
    FileWatchStartupToken,
    scoped((c) => ({
      start: () => c.resolve(FileContentViewModelToken).startWatching(),
      stop: () => c.resolve(FileContentViewModelToken).stopWatching(),
    })),
  );
  container.register(
    DocumentThemeToken,
    scoped((c) => createDocumentTheme({ themeModel: c.resolve(ThemeModelToken) })),
  );
  container.register(
    DocumentDensityToken,
    scoped((c) => createDocumentDensity({ settingsModel: c.resolve(SettingsModelToken) })),
  );
  container.register(
    UnloadGuardToken,
    scoped((c) => createUnloadGuard({ tabDirtyState: c.resolve(TabDirtyStateToken) })),
  );
  container.register(
    GlobalErrorHandlersToken,
    scoped((c) => createGlobalErrorHandlers({ errorLog: c.resolve(ErrorLogToken) })),
  );
  container.register(
    ErrorNotifierToken,
    scoped((c) => createErrorNotifier({ errorLog: c.resolve(ErrorLogToken), notifications: c.resolve(NotificationServiceToken) })),
  );
  container.register(
    MarkdownActivationToken,
    scoped((c) => ({
      start: () => {
        c.resolve(MarkdownPreviewViewModelToken);
      },
      stop: () => undefined,
    })),
  );
  container.register(
    GlobalKeybindingsToken,
    scoped((c) =>
      createGlobalKeybindings({ commandCenterRegistry: c.resolve(CommandCenterRegistryToken) }),
  ),
  );
  // 등록된 것을 스코프에서 resolve해 하나로 합친다 — descriptor가 토큰을 담는 이유가 여기다.
  container.register(
    WorkbenchStartupToken,
    scoped((c) => {
      const items = c
        .resolve(WorkbenchStartupRegistryToken)
        .list()
        .map((descriptor) => c.resolve(descriptor.token));
      return {
        start: () => items.forEach((item) => item.start()),
        stop: () => items.forEach((item) => item.stop()),
      };
    }),
  );
  container.register(
    FileContentViewModelToken,
    scoped(
      (c) =>
        new FileContentViewModel({
          fileContentModel: c.resolve(FileContentModelToken),
          pinTab: c.resolve(PinTabToken),
        }),
    ),
  );
  container.register(
    ShellViewModelToken,
    scoped(
      (c) =>
        new ShellViewModel({
          activityModel: c.resolve(ActivityModelToken),
          tabsModel: c.resolve(TabsModelToken),
          themeModel: c.resolve(ThemeModelToken),
          activityBarRegistry: c.resolve(ActivityBarRegistryToken),
          tabDirtyState: c.resolve(TabDirtyStateToken),
          startup: c.resolve(WorkbenchStartupToken),
          serverInfo: c.resolve(ServerInfoToken),
          notificationService: c.resolve(NotificationServiceToken),
          commandCenterRegistry: c.resolve(CommandCenterRegistryToken),
          copyToClipboard,
          reloadApp,
        }),
    ),
  );

  const startupRegistry = container.resolve(WorkbenchStartupRegistryToken);
  // 오류 핸들러가 첫째다 — 뒤의 기여가 켜지다 던져도 잡힌다.
  startupRegistry.add({ id: "globalErrorHandlers", token: GlobalErrorHandlersToken });
  startupRegistry.add({ id: "errorNotifier", token: ErrorNotifierToken });
  startupRegistry.add({ id: "documentTheme", token: DocumentThemeToken });
  startupRegistry.add({ id: "documentDensity", token: DocumentDensityToken });
  startupRegistry.add({ id: "globalKeybindings", token: GlobalKeybindingsToken });
  startupRegistry.add({ id: "unloadGuard", token: UnloadGuardToken });
  startupRegistry.add({ id: "fileWatch", token: FileWatchStartupToken });
  startupRegistry.add({ id: "markdown", token: MarkdownActivationToken });

  // Registry 전부 singleton이라 루트에서 한 번만 채운다.
  container.resolve(ActivityBarRegistryToken).add({ id: EXPLORER_ID, title: "탐색기", iconId: "files", keybinding: "ctrl+shift+e" });
  container.resolve(SidebarContentRegistryToken).add({ id: EXPLORER_ID, PanelComponent: DirectoryTreeView });
  container.resolve(TabContentRegistryToken).add({
    id: FILE_TAB_KIND,
    iconId: "fileCode",
    TabComponent: ({ tabId, reveal }) => <FileContentView path={tabId} reveal={reveal} />,
  });
  container.resolve(ActivityBarRegistryToken).add({ id: SEARCH_ID, title: "검색", iconId: "search", keybinding: "ctrl+shift+f" });
  container.resolve(SidebarContentRegistryToken).add({ id: SEARCH_ID, PanelComponent: ({ onFileOpen }) => <SearchView onFileOpen={onFileOpen} /> });
  container.resolve(ActivityBarRegistryToken).add({ id: SCM_ID, title: "소스 제어", iconId: "sourceControl", keybinding: "ctrl+shift+g" });
  container.resolve(SidebarContentRegistryToken).add({ id: SCM_ID, PanelComponent: ({ onOpenTab }) => <SourceControlView onOpenTab={onOpenTab} /> });
  container.resolve(TabContentRegistryToken).add({ id: DIFF_TAB_KIND, iconId: "sourceControl", TabComponent: ({ tabId }) => <DiffTabView tabId={tabId} /> });
  container.resolve(ActivityBarRegistryToken).add({ id: AGENT_ID, title: "에이전트", iconId: "brain", keybinding: "ctrl+shift+a" });
  container.resolve(SidebarContentRegistryToken).add({ id: AGENT_ID, PanelComponent: ({ onOpenTab }) => <ChatSessionsView onOpenTab={onOpenTab} /> });
  container.resolve(TabContentRegistryToken).add({ id: "keybindings", iconId: "keyboard", TabComponent: () => <KeybindingsTabView /> });
  container.resolve(TabContentRegistryToken).add({ id: "settings", iconId: "settingsGear", TabComponent: () => <SettingsTabView /> });
  container.resolve(TabContentRegistryToken).add({ id: PREVIEW_TAB_KIND, iconId: "bookOpen", TabComponent: ({ tabId }) => <MarkdownPreviewTabView tabId={tabId} /> });
  container.resolve(TabContentRegistryToken).add({
    id: CHAT_TAB_KIND,
    iconId: "brain",
    TabComponent: ({ tabId }) => <ChatTabView sessionId={tabId} />,
  });

  return container;
}
