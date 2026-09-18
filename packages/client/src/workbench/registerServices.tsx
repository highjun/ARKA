import { CommandService } from "#core/commands";
import { Container } from "#core/di";
import { useViewModel } from "#core/viewmodel";
import { useEffect } from "react";
import {
  DirectoryTreeModel,
  DirectoryTreeViewModel,
  FileContentModel,
  FileContentViewModel,
} from "../extensions/filesystem";
import { MarkdownPreviewModel, MarkdownPreviewViewModel, PREVIEW_TAB_KIND } from "../extensions/markdown";
import { MarkdownPreviewTabView } from "../extensions/markdown/view/MarkdownPreviewTabView";
import { SearchModel, SearchViewModel } from "../extensions/search";
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
import { SettingsViewModel } from "./viewmodel/SettingsViewModel";
import { WorkbenchStartupRegistry } from "./model/WorkbenchStartupRegistry";
import { ActivityBarRegistry } from "./model/ActivityBarRegistry";
import { ActivityModel } from "./model/ActivityModel";
import { ErrorLog } from "./model/ErrorLog";
import { Notifications } from "./model/Notifications";
import { SidebarContentRegistry } from "./model/SidebarContentRegistry";
import { TabContentRegistry } from "./model/TabContentRegistry";
import { TabLayout } from "./model/TabLayout";
import { ColorMode } from "./model/ColorMode";
import { AppLifetime } from "./model/AppLifetime";
import { Workspace } from "./model/Workspace";
import type { ServerInfo } from "./model/IServerInfo";
import { ShellViewModel } from "./viewmodel/ShellViewModel";
import type { IWorkbenchStartup } from "./model/IWorkbenchStartup";

declare module "#core/di" {
  /**
   * 셸 수명주기에 얹는 기여들. 조립부만 아는 것이라 여기서 선언한다.
   * `arka.workbench.startup`은 아래 전부를 합친 것 — `ShellViewModel`이 이것 하나만 받는다.
   * `startup.markdown`은 익스텐션 커맨드를 탭이 뜨기 전에 팔레트에 올리려고 VM을 미리 만드는 것이다.
   */
  interface InstanceMap {
    "arka.workbench.startup.fileWatch": IWorkbenchStartup;
    "arka.workbench.startup.documentTheme": IWorkbenchStartup;
    "arka.workbench.startup.documentDensity": IWorkbenchStartup;
    "arka.workbench.startup.unloadGuard": IWorkbenchStartup;
    "arka.workbench.startup.globalKeybindings": IWorkbenchStartup;
    "arka.workbench.startup.globalErrorHandlers": IWorkbenchStartup;
    "arka.workbench.startup.errorNotifier": IWorkbenchStartup;
    "arka.workbench.startup.markdown": IWorkbenchStartup;
    "arka.workbench.startup": IWorkbenchStartup;
  }
}

/** 탐색기 활동의 id. ActivityBar·SidebarContent 등록 둘 다 이 문자열로 서로를 잇는다. */
const EXPLORER_ID = "explorer";
/** 검색 활동의 id. */
const SEARCH_ID = "search";
/** 사용자 단축키 재정의가 저장되는 키. */
const KEYBINDING_OVERRIDES_KEY = "workbench.keybindings";
/** 파일 탭의 kind. `IShellViewModel.previewFile`이 여는 탭의 kind와 같아야 TabContent가 찾는다. */
const FILE_TAB_KIND = "file";

/**
 * 파일 탭. 탭이 뜨면 그 파일을 열고, 그리는 것은 `FileContentView`에 맡긴다. 여는 일을 효과에 두는 이유 —
 * 렌더 중에 Model을 바꾸면 React와 MobX가 둘 다 막는다. `view/`는 훅이 `useViewModel` 하나뿐이라 여기(조립부)다.
 * R11에서 TabProvider가 `openTab`에서 파일을 읽으면 이 자리는 사라진다.
 */
const FileTab = ({
  tabId,
  reveal,
}: {
  readonly tabId: string;
  readonly reveal?: { readonly line: number; readonly column: number; readonly seq: number } | null;
}) => {
  const fileContent = useViewModel("arka.filesystem.fileContentViewModel");
  useEffect(() => fileContent.openFile(tabId), [fileContent, tabId]);
  return <FileContentView path={tabId} reveal={reveal} />;
};

/**
 * 조립은 여기 한 곳이다. 이 파일만 읽으면 무엇이 도는지 다 보인다.
 *
 * Shell의 확장 지점(ActivityBar·SidebarContent·TabContent)도 여기서 채운다 — filesystem이
 * shell 타입을 거꾸로 import하는 순환을 피하기 위해서다(지금은 shell → filesystem 단방향).
 */
export function createApplication(): Container {
  const container = new Container("app");

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

  container.register("arka.filesystem.workspaceFiles", "singleton", createWorkspaceFilesPort);
  container.register("arka.filesystem.workspaceWatch", "singleton", createWorkspaceWatchPort);
  container.register("arka.search.service", "singleton", createSearchServicePort);
  container.register("arka.workbench.storage", "singleton", createStoragePort);
  // 앱 수명과 워크스페이스가 같은 답을 읽는다 — 한 번만 묻고 나눈다.
  const serverInfoPort = createServerInfoPort();
  let serverInfoLoading: Promise<ServerInfo | null> | undefined;
  container.register("arka.workbench.serverInfo", "singleton", () => ({
    load: () => (serverInfoLoading ??= serverInfoPort.load()),
  }));
  // 재정의는 localStorage에 산다 — 서버 settings.json은 나중 라운드. 실행 오류는 오류 기록으로 간다.
  container.register("arka.commands", "singleton", (c) => {
    const storage = c.resolve("arka.workbench.storage");
    return new CommandService({
      overridesStore: {
        load: () => JSON.parse(storage.get(KEYBINDING_OVERRIDES_KEY) ?? "{}") as Record<string, string | null>,
        save: (overrides) => storage.set(KEYBINDING_OVERRIDES_KEY, JSON.stringify(overrides)),
      },
      reportError: (error) => c.resolve("arka.workbench.errorLog").report(error, "command"),
    });
  });
  container.register("arka.workbench.activityBarRegistry", "singleton", () => new ActivityBarRegistry());
  container.register("arka.workbench.sidebarContentRegistry", "singleton", () => new SidebarContentRegistry());
  container.register("arka.workbench.tabContentRegistry", "singleton", () => new TabContentRegistry());
  container.register("arka.workbench.startupRegistry", "singleton", () => new WorkbenchStartupRegistry());

  container.register("arka.workbench.errorLog", "singleton", () => new ErrorLog());
  container.register("arka.workbench.notifications", "singleton", () => new Notifications());
  container.register(
    "arka.workbench.appLifetime",
    "singleton",
    (c) => new AppLifetime({ serverInfo: c.resolve("arka.workbench.serverInfo"), reload: reloadApp }),
  );
  container.register(
    "arka.workbench.workspace",
    "singleton",
    (c) => new Workspace({ serverInfo: c.resolve("arka.workbench.serverInfo") }),
  );
  container.register("arka.workbench.activityModel", "singleton", () => new ActivityModel());
  container.register(
    "arka.workbench.tabLayout",
    "singleton",
    (c) => new TabLayout({ storage: c.resolve("arka.workbench.storage") }),
  );
  container.register(
    "arka.workbench.colorMode",
    "singleton",
    (c) => new ColorMode({ storage: c.resolve("arka.workbench.storage") }),
  );
  container.register(
    "arka.workbench.settingsModel",
    "singleton",
    (c) => new SettingsModel({ storage: c.resolve("arka.workbench.storage") }),
  );
  container.register(
    "arka.workbench.settingsViewModel",
    "scoped",
    (c) =>
      new SettingsViewModel({
        colorMode: c.resolve("arka.workbench.colorMode"),
        settingsModel: c.resolve("arka.workbench.settingsModel"),
      }),
  );
  container.register(
    "arka.filesystem.directoryTreeModel",
    "singleton",
    (c) =>
      new DirectoryTreeModel({
        workspaceFiles: c.resolve("arka.filesystem.workspaceFiles"),
        workspaceWatch: c.resolve("arka.filesystem.workspaceWatch"),
      }),
  );
  container.register(
    "arka.filesystem.fileContentModel",
    "singleton",
    (c) =>
      new FileContentModel({
        workspaceFiles: c.resolve("arka.filesystem.workspaceFiles"),
        workspaceWatch: c.resolve("arka.filesystem.workspaceWatch"),
      }),
  );

  // ViewModel은 scoped다 — 화면 하나가 사는 동안만 유지되고, 그 스코프를 dispose하면
  // 구독까지 함께 정리된다.
  container.register(
    "arka.search.model",
    "singleton",
    (c) => new SearchModel({ searchService: c.resolve("arka.search.service") }),
  );
  container.register(
    "arka.search.viewModel",
    "scoped",
    (c) => new SearchViewModel({ searchModel: c.resolve("arka.search.model") }),
  );
  // markdown은 filesystem을 모른다 — 두 포트를 markdown이 바라는 모양으로 감싸는 어댑터에 넘기는
  // 것까지가 조립부의 일이다. 감싸는 방법 자체는 markdown의 infra가 안다.
  container.register("arka.markdown.source", "singleton", (c) =>
    createWorkspaceMarkdownSource({
      files: c.resolve("arka.filesystem.workspaceFiles"),
      watch: c.resolve("arka.filesystem.workspaceWatch"),
    }),
  );
  container.register(
    "arka.markdown.previewModel",
    "singleton",
    (c) => new MarkdownPreviewModel({ source: c.resolve("arka.markdown.source") }),
  );
  container.register(
    "arka.markdown.previewViewModel",
    "scoped",
    (c) =>
      new MarkdownPreviewViewModel({
        previewModel: c.resolve("arka.markdown.previewModel"),
        commandCenterRegistry: c.resolve("arka.commands"),
        activeFile: () => {
          const active = c.resolve("arka.workbench.shellViewModel").activeTab;
          return active !== null && active.kind === FILE_TAB_KIND ? active.id : null;
        },
        openTab: (tab) => c.resolve("arka.workbench.shellViewModel").openTab(tab),
      }),
  );
  container.register(
    "arka.filesystem.directoryTreeViewModel",
    "scoped",
    (c) =>
      new DirectoryTreeViewModel({
        directoryTreeModel: c.resolve("arka.filesystem.directoryTreeModel"),
        commandCenterRegistry: c.resolve("arka.commands"),
        copyToClipboard,
        isTypingSurface,
      }),
  );
  // filesystem은 shell을 모른다 — 탭 고정이라는 "무엇"만 계약으로 알고, 그게 ShellViewModel
  // 이라는 "누구"는 이 조립부만 안다.
  container.register("arka.filesystem.pinTab", "scoped", (c) => ({
    pin: (path: string) => c.resolve("arka.workbench.shellViewModel").pinTab(path),
  }));
  // 셸은 "이 탭이 dirty인가"라는 계약만 알고, 그게 filesystem이라는 것은 이 조립부만 안다
  // — `"arka.filesystem.pinTab"`을 뒤집은 모양이다. 스코프에서 resolve해야 View가 보는 것과 같은 인스턴스다.
  container.register("arka.workbench.tabDirtyState", "scoped", (c) => ({
    isDirty: (tabId: string) => c.resolve("arka.filesystem.fileContentViewModel").rows[tabId]?.isDirty ?? false,
    hasAnyDirty: () => Object.values(c.resolve("arka.filesystem.fileContentViewModel").rows).some((row) => row.isDirty),
    onDidChange: (listener: () => void) => c.resolve("arka.filesystem.fileContentViewModel").onDidChange(listener),
  }));
  // 셸이 뜨고 질 때 켜고 끌 것들. 셸은 무엇이 켜지는지 모르고 목록만 받는다.
  container.register("arka.workbench.startup.fileWatch", "scoped", (c) => ({
    start: () => c.resolve("arka.filesystem.fileContentViewModel").startWatching(),
    stop: () => c.resolve("arka.filesystem.fileContentViewModel").stopWatching(),
  }));
  container.register("arka.workbench.startup.documentTheme", "scoped", (c) =>
    createDocumentTheme({ colorMode: c.resolve("arka.workbench.colorMode") }),
  );
  container.register("arka.workbench.startup.documentDensity", "scoped", (c) =>
    createDocumentDensity({ settingsModel: c.resolve("arka.workbench.settingsModel") }),
  );
  container.register("arka.workbench.startup.unloadGuard", "scoped", (c) =>
    createUnloadGuard({ tabDirtyState: c.resolve("arka.workbench.tabDirtyState") }),
  );
  container.register("arka.workbench.startup.globalErrorHandlers", "scoped", (c) =>
    createGlobalErrorHandlers({ errorLog: c.resolve("arka.workbench.errorLog") }),
  );
  container.register("arka.workbench.startup.errorNotifier", "scoped", (c) =>
    createErrorNotifier({
      errorLog: c.resolve("arka.workbench.errorLog"),
      notifications: c.resolve("arka.workbench.notifications"),
    }),
  );
  container.register("arka.workbench.startup.markdown", "scoped", (c) => ({
    start: () => {
      c.resolve("arka.markdown.previewViewModel");
    },
    stop: () => undefined,
  }));
  container.register("arka.workbench.startup.globalKeybindings", "scoped", (c) =>
    createGlobalKeybindings({ commands: c.resolve("arka.commands") }),
  );
  // 등록된 것을 스코프에서 resolve해 하나로 합친다 — descriptor가 토큰을 담는 이유가 여기다.
  container.register("arka.workbench.startup", "scoped", (c) => {
    const items = c
      .resolve("arka.workbench.startupRegistry")
      .list()
      .map((descriptor) => c.resolve(descriptor.instanceId));
    return {
      start: () => items.forEach((item) => item.start()),
      stop: () => items.forEach((item) => item.stop()),
    };
  });
  container.register(
    "arka.filesystem.fileContentViewModel",
    "scoped",
    (c) =>
      new FileContentViewModel({
        fileContentModel: c.resolve("arka.filesystem.fileContentModel"),
        pinTab: c.resolve("arka.filesystem.pinTab"),
      }),
  );
  container.register(
    "arka.workbench.shellViewModel",
    "scoped",
    (c) =>
      new ShellViewModel({
        activityModel: c.resolve("arka.workbench.activityModel"),
        tabLayout: c.resolve("arka.workbench.tabLayout"),
        colorMode: c.resolve("arka.workbench.colorMode"),
        activityBarRegistry: c.resolve("arka.workbench.activityBarRegistry"),
        tabDirtyState: c.resolve("arka.workbench.tabDirtyState"),
        startup: c.resolve("arka.workbench.startup"),
        appLifetime: c.resolve("arka.workbench.appLifetime"),
        workspace: c.resolve("arka.workbench.workspace"),
        notifications: c.resolve("arka.workbench.notifications"),
        commandCenterRegistry: c.resolve("arka.commands"),
        copyToClipboard,
      }),
  );

  const startupRegistry = container.resolve("arka.workbench.startupRegistry");
  // 오류 핸들러가 첫째다 — 뒤의 기여가 켜지다 던져도 잡힌다.
  startupRegistry.add({ id: "globalErrorHandlers", instanceId: "arka.workbench.startup.globalErrorHandlers" });
  startupRegistry.add({ id: "errorNotifier", instanceId: "arka.workbench.startup.errorNotifier" });
  startupRegistry.add({ id: "documentTheme", instanceId: "arka.workbench.startup.documentTheme" });
  startupRegistry.add({ id: "documentDensity", instanceId: "arka.workbench.startup.documentDensity" });
  startupRegistry.add({ id: "globalKeybindings", instanceId: "arka.workbench.startup.globalKeybindings" });
  startupRegistry.add({ id: "unloadGuard", instanceId: "arka.workbench.startup.unloadGuard" });
  startupRegistry.add({ id: "fileWatch", instanceId: "arka.workbench.startup.fileWatch" });
  startupRegistry.add({ id: "markdown", instanceId: "arka.workbench.startup.markdown" });

  // Registry 전부 singleton이라 루트에서 한 번만 채운다.
  container
    .resolve("arka.workbench.activityBarRegistry")
    .add({ id: EXPLORER_ID, title: "탐색기", iconId: "files", keybinding: "ctrl+shift+e" });
  container
    .resolve("arka.workbench.sidebarContentRegistry")
    .add({ id: EXPLORER_ID, ContentComponent: DirectoryTreeView });
  container
    .resolve("arka.workbench.tabContentRegistry")
    .add({ id: FILE_TAB_KIND, iconId: "fileCode", TabComponent: FileTab });
  container
    .resolve("arka.workbench.activityBarRegistry")
    .add({ id: SEARCH_ID, title: "검색", iconId: "search", keybinding: "ctrl+shift+f" });
  container
    .resolve("arka.workbench.sidebarContentRegistry")
    .add({ id: SEARCH_ID, ContentComponent: ({ onFileOpen }) => <SearchView onFileOpen={onFileOpen} /> });
  container
    .resolve("arka.workbench.tabContentRegistry")
    .add({ id: "keybindings", iconId: "keyboard", TabComponent: () => <KeybindingsTabView /> });
  container
    .resolve("arka.workbench.tabContentRegistry")
    .add({ id: "settings", iconId: "settingsGear", TabComponent: () => <SettingsTabView /> });
  container.resolve("arka.workbench.tabContentRegistry").add({
    id: PREVIEW_TAB_KIND,
    iconId: "bookOpen",
    TabComponent: ({ tabId }) => <MarkdownPreviewTabView tabId={tabId} />,
  });

  return container;
}
