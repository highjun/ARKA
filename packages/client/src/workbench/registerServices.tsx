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
import { createWorkspaceFilesPort } from "../extensions/filesystem/infra/HttpWorkspaceFiles";
import { createWorkspaceWatchPort } from "../extensions/filesystem/infra/HttpWorkspaceWatch";
import { DirectoryTreeView } from "../extensions/filesystem/view/DirectoryTreeView";
import { FileContentView } from "../extensions/filesystem/view/FileContentView";
import { createDocumentTheme } from "./infra/DocumentTheme";
import { createGlobalErrorHandlers } from "./infra/GlobalErrorHandlers";
import { createGlobalKeybindings } from "./infra/GlobalKeybindings";
import { createServerInfoPort } from "./infra/HttpServerInfo";
import { createUnloadGuard } from "./infra/UnloadGuard";
import { createStoragePort } from "./infra/LocalStorage";
import { WorkbenchStartupRegistry } from "./model/WorkbenchStartupRegistry";
import { ActivityBarRegistry } from "./model/ActivityBarRegistry";
import { ActivityModel } from "./model/ActivityModel";
import { ErrorLog } from "./model/ErrorLog";
import { ErrorLogToken } from "./model/IErrorLog";
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
const UnloadGuardToken = createToken<IWorkbenchStartup>("startup.unloadGuard");
const GlobalKeybindingsToken = createToken<IWorkbenchStartup>("startup.globalKeybindings");
const GlobalErrorHandlersToken = createToken<IWorkbenchStartup>("startup.globalErrorHandlers");
/** 위 다섯을 합친 것 — `ShellViewModel`이 이것 하나만 받는다. */
const WorkbenchStartupToken = createToken<IWorkbenchStartup>("workbenchStartup");

/** 탐색기 활동의 id. ActivityBar·SidebarContent 등록 둘 다 이 문자열로 서로를 잇는다. */
const EXPLORER_ID = "explorer";
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
  container.register(StorageToken, singleton(createStoragePort));
  container.register(ServerInfoToken, singleton(createServerInfoPort));
  container.register(CommandCenterRegistryToken, singleton(() => new CommandCenterRegistry()));
  container.register(ActivityBarRegistryToken, singleton(() => new ActivityBarRegistry()));
  container.register(SidebarContentRegistryToken, singleton(() => new SidebarContentRegistry()));
  container.register(TabContentRegistryToken, singleton(() => new TabContentRegistry()));
  container.register(WorkbenchStartupRegistryToken, singleton(() => new WorkbenchStartupRegistry()));

  container.register(ErrorLogToken, singleton(() => new ErrorLog()));
  container.register(ActivityModelToken, singleton(() => new ActivityModel()));
  container.register(
    TabsModelToken,
    singleton((c) => new TabsModel({ storage: c.resolve(StorageToken) })),
  );
  container.register(
    ThemeModelToken,
    singleton((c) => new ThemeModel({ storage: c.resolve(StorageToken) })),
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

  // ViewModel은 scoped다 — 화면 하나가 사는 동안만 유지되고, 그 스코프를 dispose하면
  // 구독까지 함께 정리된다.
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
    UnloadGuardToken,
    scoped((c) => createUnloadGuard({ tabDirtyState: c.resolve(TabDirtyStateToken) })),
  );
  container.register(
    GlobalErrorHandlersToken,
    scoped((c) => createGlobalErrorHandlers({ errorLog: c.resolve(ErrorLogToken) })),
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
          commandCenterRegistry: c.resolve(CommandCenterRegistryToken),
          copyToClipboard,
          reloadApp,
        }),
    ),
  );

  const startupRegistry = container.resolve(WorkbenchStartupRegistryToken);
  // 오류 핸들러가 첫째다 — 뒤의 기여가 켜지다 던져도 잡힌다.
  startupRegistry.add({ id: "globalErrorHandlers", token: GlobalErrorHandlersToken });
  startupRegistry.add({ id: "documentTheme", token: DocumentThemeToken });
  startupRegistry.add({ id: "globalKeybindings", token: GlobalKeybindingsToken });
  startupRegistry.add({ id: "unloadGuard", token: UnloadGuardToken });
  startupRegistry.add({ id: "fileWatch", token: FileWatchStartupToken });

  // Registry 전부 singleton이라 루트에서 한 번만 채운다.
  container.resolve(ActivityBarRegistryToken).add({ id: EXPLORER_ID, title: "탐색기", iconId: "files" });
  container.resolve(SidebarContentRegistryToken).add({ id: EXPLORER_ID, PanelComponent: DirectoryTreeView });
  container.resolve(TabContentRegistryToken).add({
    id: FILE_TAB_KIND,
    iconId: "fileCode",
    TabComponent: ({ tabId }) => <FileContentView path={tabId} />,
  });

  return container;
}
