import { CommandService } from "#core/commands";
import { Container } from "#core/di";
import { Registry } from "#core/registry";
import { Settings, type ISettings } from "#core/settings";
import { URI } from "#contracts";
import {
  DirectoryTreeModel,
  DirectoryTreeViewModel,
  FileContentModel,
  FileContentViewModel,
} from "../extensions/filesystem";
import { MarkdownPreviewModel, MarkdownPreviewViewModel } from "../extensions/markdown";
import { createPreviewTabProvider } from "../extensions/markdown/view/previewTabProvider";
import { SearchModel, SearchViewModel } from "../extensions/search";
import { createSearchServicePort } from "../extensions/search/infra/HttpSearchService";
import { SearchView } from "../extensions/search/view/SearchView";
import { createWorkspaceMarkdownSource } from "../extensions/markdown/infra/WorkspaceMarkdownSource";
import { createWorkspaceFilesPort } from "../extensions/filesystem/infra/HttpWorkspaceFiles";
import { createWorkspaceWatchPort } from "../extensions/filesystem/infra/HttpWorkspaceWatch";
import { DirectoryTreeView } from "../extensions/filesystem/view/DirectoryTreeView";
import { createTextTabProvider } from "../extensions/filesystem/view/textTabProvider";
import { createDocumentDensity, DENSITY_SETTING_ID } from "./infra/DocumentDensity";
import { createDocumentTheme } from "./infra/DocumentTheme";
import { createErrorNotifier } from "./infra/ErrorNotifier";
import { createGlobalErrorHandlers } from "./infra/GlobalErrorHandlers";
import { createGlobalKeybindings } from "./infra/GlobalKeybindings";
import { createServerInfoPort } from "./infra/HttpServerInfo";
import { createUnloadGuard } from "./infra/UnloadGuard";
import { createStoragePort } from "./infra/LocalStorage";
import { createViewportQuery } from "./infra/ViewportQuery";
import { keybindingsTabProvider } from "./view/keybindingsTabProvider";
import { settingsTabProvider } from "./view/settingsTabProvider";
import { SettingsViewModel } from "./viewmodel/SettingsViewModel";
import { WorkbenchStartupRegistry } from "./model/WorkbenchStartupRegistry";
import { ErrorLog } from "./model/ErrorLog";
import { Notifications } from "./model/Notifications";
import { TabLayout } from "./model/TabLayout";
import { TabSystem } from "./model/TabSystem";
import { collectTabs, findLeaf } from "./model/paneTree";
import { ColorMode } from "./model/ColorMode";
import { AppLifetime } from "./model/AppLifetime";
import { Workspace } from "./model/Workspace";
import type { ServerInfo } from "./model/IServerInfo";
import { ShellViewModel } from "./viewmodel/ShellViewModel";
import { TabSystemViewModel } from "./viewmodel/TabSystemViewModel";
import { NotificationViewModel } from "./viewmodel/NotificationViewModel";
import { AppStatusViewModel } from "./viewmodel/AppStatusViewModel";
import { CommandPaletteViewModel } from "./viewmodel/CommandPaletteViewModel";
import { KeybindingViewModel } from "./viewmodel/KeybindingViewModel";
import type { IWorkbenchStartup } from "./model/IWorkbenchStartup";

declare module "#core/di" {
  /**
   * 셸 수명주기에 얹는 기여들. 조립부만 아는 것이라 여기서 선언한다.
   * `arka.workbench.startup`은 아래 전부를 합친 것 — `ShellViewModel`이 이것 하나만 받는다.
   * `startup.markdown`은 익스텐션 커맨드를 탭이 뜨기 전에 팔레트에 올리려고 VM을 미리 만드는 것이다.
   * `arka.settings`는 core 서비스지만 등록은 workbench가 한다(R15에서 모듈로).
   */
  interface InstanceMap {
    "arka.settings": ISettings;
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

/** 탐색기 사이드바의 id. */
const EXPLORER_ID = "explorer";
/** 검색 사이드바의 id. */
const SEARCH_ID = "search";
/** 사용자 단축키 재정의가 저장되는 키. */
const KEYBINDING_OVERRIDES_KEY = "workbench.keybindings";
/** 설정 값이 저장되는 키. */
const SETTINGS_KEY = "workbench.settings";

/** `arka.workbench.open`이 받는 것. */
const isOpenContext = (value: unknown): value is { readonly uri: URI; readonly preview?: boolean } =>
  typeof value === "object" && value !== null && "uri" in value && value.uri instanceof URI;
/** `arka.workbench.retargetTabs`가 받는 것 — 워크스페이스 루트 기준 경로 접두어 둘. */
const isRetargetContext = (value: unknown): value is { readonly oldPrefix: string; readonly newPrefix: string } =>
  typeof value === "object" &&
  value !== null &&
  "oldPrefix" in value &&
  typeof value.oldPrefix === "string" &&
  "newPrefix" in value &&
  typeof value.newPrefix === "string";

/**
 * 조립은 여기 한 곳이다. 이 파일만 읽으면 무엇이 도는지 다 보인다.
 *
 * Shell의 확장 지점(ActivityBar·SidebarContent·TabSystem)도 여기서 채운다 — filesystem이
 * shell 타입을 거꾸로 import하는 순환을 피하기 위해서다(지금은 shell → filesystem 단방향).
 *
 * **전부 singleton이다.** 탭마다 자식 컨테이너가 생기므로 scoped면 탭 안에서 꺼낸 ViewModel이 셸이 보는 것과
 * 갈린다 — 탭마다 따로여야 하는 인스턴스는 아직 없다. 돌아오기 전에 아무것도 만들지 않는다(탭 복원만 빼고) —
 * 테스트가 루트에 대역을 다시 물릴 수 있어야 한다.
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
  // 설정도 localStorage에 산다 — 서버 settings.json은 나중 라운드.
  container.register("arka.settings", "singleton", (c) => {
    const storage = c.resolve("arka.workbench.storage");
    return new Settings({
      store: {
        load: () => JSON.parse(storage.get(SETTINGS_KEY) ?? "{}") as Record<string, unknown>,
        save: (values) => storage.set(SETTINGS_KEY, JSON.stringify(values)),
      },
    });
  });
  container.register("arka.workbench.sidebar", "singleton", () => new Registry());
  container.register("arka.workbench.bottom", "singleton", () => new Registry());
  container.register("arka.workbench.tabSystem", "singleton", () => new Registry());
  container.register("arka.workbench.viewport", "singleton", createViewportQuery);
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
  container.register(
    "arka.workbench.tabLayout",
    "singleton",
    (c) => new TabLayout({ storage: c.resolve("arka.workbench.storage") }),
  );
  // 탭 컨테이너의 부모는 앱 루트다 — 탭 안에서 꺼내는 것이 셸이 보는 것과 같은 인스턴스가 된다.
  container.register(
    "arka.workbench.tabs",
    "singleton",
    (c) =>
      new TabSystem({
        layout: c.resolve("arka.workbench.tabLayout"),
        providers: c.resolve("arka.workbench.tabSystem"),
        notifications: c.resolve("arka.workbench.notifications"),
        root: container,
      }),
  );
  container.register(
    "arka.workbench.colorMode",
    "singleton",
    (c) => new ColorMode({ storage: c.resolve("arka.workbench.storage") }),
  );
  container.register(
    "arka.workbench.settingsViewModel",
    "singleton",
    (c) => new SettingsViewModel({ settings: c.resolve("arka.settings") }),
  );
  container.register(
    "arka.workbench.keybindingViewModel",
    "singleton",
    (c) => new KeybindingViewModel({ commands: c.resolve("arka.commands") }),
  );
  container.register(
    "arka.workbench.commandPaletteViewModel",
    "singleton",
    (c) => new CommandPaletteViewModel({ commands: c.resolve("arka.commands") }),
  );
  container.register(
    "arka.workbench.notificationViewModel",
    "singleton",
    (c) => new NotificationViewModel({ notifications: c.resolve("arka.workbench.notifications") }),
  );
  container.register(
    "arka.workbench.appStatusViewModel",
    "singleton",
    (c) =>
      new AppStatusViewModel({
        appLifetime: c.resolve("arka.workbench.appLifetime"),
        workspace: c.resolve("arka.workbench.workspace"),
      }),
  );
  container.register(
    "arka.workbench.tabSystemViewModel",
    "singleton",
    (c) =>
      new TabSystemViewModel({
        tabLayout: c.resolve("arka.workbench.tabLayout"),
        tabs: c.resolve("arka.workbench.tabs"),
        commands: c.resolve("arka.commands"),
        copyToClipboard,
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

  // ViewModel도 singleton이다 — 앱에 화면은 하나고, 앱 컨테이너를 dispose하면 구독까지 함께 정리된다.
  container.register(
    "arka.search.model",
    "singleton",
    (c) => new SearchModel({ searchService: c.resolve("arka.search.service") }),
  );
  container.register(
    "arka.search.viewModel",
    "singleton",
    (c) =>
      new SearchViewModel({
        searchModel: c.resolve("arka.search.model"),
        commandCenterRegistry: c.resolve("arka.commands"),
      }),
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
    "singleton",
    (c) =>
      new MarkdownPreviewViewModel({
        previewModel: c.resolve("arka.markdown.previewModel"),
        commandCenterRegistry: c.resolve("arka.commands"),
      }),
  );
  container.register(
    "arka.filesystem.directoryTreeViewModel",
    "singleton",
    (c) =>
      new DirectoryTreeViewModel({
        directoryTreeModel: c.resolve("arka.filesystem.directoryTreeModel"),
        commandCenterRegistry: c.resolve("arka.commands"),
        copyToClipboard,
        isTypingSurface,
      }),
  );
  // 셸이 뜨고 질 때 켜고 끌 것들. 셸은 무엇이 켜지는지 모르고 목록만 받는다.
  container.register("arka.workbench.startup.fileWatch", "singleton", (c) => ({
    start: () => c.resolve("arka.filesystem.fileContentViewModel").startWatching(),
    stop: () => c.resolve("arka.filesystem.fileContentViewModel").stopWatching(),
  }));
  container.register("arka.workbench.startup.documentTheme", "singleton", (c) =>
    createDocumentTheme({ colorMode: c.resolve("arka.workbench.colorMode") }),
  );
  container.register("arka.workbench.startup.documentDensity", "singleton", (c) =>
    createDocumentDensity({ settings: c.resolve("arka.settings") }),
  );
  container.register("arka.workbench.startup.unloadGuard", "singleton", (c) =>
    createUnloadGuard({ tabs: c.resolve("arka.workbench.tabs") }),
  );
  container.register("arka.workbench.startup.globalErrorHandlers", "singleton", (c) =>
    createGlobalErrorHandlers({ errorLog: c.resolve("arka.workbench.errorLog") }),
  );
  container.register("arka.workbench.startup.errorNotifier", "singleton", (c) =>
    createErrorNotifier({
      errorLog: c.resolve("arka.workbench.errorLog"),
      notifications: c.resolve("arka.workbench.notifications"),
    }),
  );
  container.register("arka.workbench.startup.markdown", "singleton", (c) => ({
    start: () => {
      c.resolve("arka.markdown.previewViewModel");
    },
    stop: () => undefined,
  }));
  container.register("arka.workbench.startup.globalKeybindings", "singleton", (c) =>
    createGlobalKeybindings({ commands: c.resolve("arka.commands") }),
  );
  // 등록된 것을 스코프에서 resolve해 하나로 합친다 — descriptor가 토큰을 담는 이유가 여기다.
  container.register("arka.workbench.startup", "singleton", (c) => {
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
    "singleton",
    (c) =>
      new FileContentViewModel({
        fileContentModel: c.resolve("arka.filesystem.fileContentModel"),
        commandCenterRegistry: c.resolve("arka.commands"),
      }),
  );
  container.register(
    "arka.workbench.shellViewModel",
    "singleton",
    (c) =>
      new ShellViewModel({
        sidebars: c.resolve("arka.workbench.sidebar"),
        bottoms: c.resolve("arka.workbench.bottom"),
        colorMode: c.resolve("arka.workbench.colorMode"),
        viewport: c.resolve("arka.workbench.viewport"),
        tabLayout: c.resolve("arka.workbench.tabLayout"),
        commands: c.resolve("arka.commands"),
        startup: c.resolve("arka.workbench.startup"),
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
  const sidebars = container.resolve("arka.workbench.sidebar");
  sidebars.add({ id: EXPLORER_ID, title: "탐색기", iconId: "files", Content: DirectoryTreeView });
  sidebars.add({ id: SEARCH_ID, title: "검색", iconId: "search", Content: SearchView });
  // 설정 스키마 — 밀도. 확장이 `activate`에서 더하는 것과 같은 자리다.
  container.resolve("arka.settings").schema.add({
    id: DENSITY_SETTING_ID,
    title: "밀도",
    type: "enum",
    default: "auto",
    options: ["auto", "compact", "touch"],
  });
  // 탭을 여는 길은 명령 하나다 — 사이드바·검색·미리보기가 전부 `arka.workbench.open`을 부른다. 문맥
  // `tab.active.*`는 확장이 "지금 보는 탭"을 셸을 모른 채 읽는 자리다.
  const commands = container.resolve("arka.commands");
  // 사이드바 보기 단축키 — 명령(`shell.showActivity.<id>`)은 `ShellViewModel`이 등록한다. R15에서 각 확장의
  // `arka.<ext>.focus`로 간다.
  commands.keybindings.add({ keybinding: "ctrl+shift+e", actionId: `shell.showActivity.${EXPLORER_ID}` });
  commands.keybindings.add({ keybinding: "ctrl+shift+f", actionId: `shell.showActivity.${SEARCH_ID}` });
  const activeTab = () => {
    const layout = container.resolve("arka.workbench.tabLayout");
    const leaf = findLeaf(layout.tree, layout.activePaneId);
    return leaf?.tabs.find((tab) => tab.id === leaf.activeTabId) ?? null;
  };
  commands.contexts.add({ id: "tab.active.uri", value: () => activeTab()?.uri ?? null });
  commands.contexts.add({ id: "tab.active.kind", value: () => activeTab()?.kind ?? null });
  commands.actions.add({
    id: "arka.workbench.open",
    label: "탭으로 열기",
    execute: (context) => {
      if (!isOpenContext(context)) return;
      void container.resolve("arka.workbench.tabs").open(context.uri, { preview: context.preview === true });
    },
  });
  commands.actions.add({
    id: "arka.workbench.retargetTabs",
    label: "탭: 옮겨진 경로 따라가기",
    execute: (context) => {
      if (!isRetargetContext(context)) return;
      container.resolve("arka.workbench.tabSystemViewModel").retargetTabs(context.oldPrefix, context.newPrefix);
    },
  });

  // 탭 provider — 여는 쪽이 자기 ViewModel을 그때 꺼낸다. 부팅 때 미리 만들면 테스트 대역이 끼어들 틈이 없다.
  const tabProviders = container.resolve("arka.workbench.tabSystem");
  tabProviders.add(settingsTabProvider);
  tabProviders.add(keybindingsTabProvider);
  const textTabProvider = createTextTabProvider({
    get fileContent() {
      return container.resolve("arka.filesystem.fileContentViewModel");
    },
  });
  tabProviders.add(textTabProvider);
  tabProviders.add(
    createPreviewTabProvider({
      get preview() {
        return container.resolve("arka.markdown.previewViewModel");
      },
    }),
  );

  // 새로고침 전에 열려 있던 탭을 provider에게 다시 묻는다 — 못 여는 것은 여기서 빠진다.
  void container
    .resolve("arka.workbench.tabs")
    .restore(collectTabs(container.resolve("arka.workbench.tabLayout").tree));

  return container;
}
