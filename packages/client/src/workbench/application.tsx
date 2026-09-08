import { CommandCenterRegistry, CommandCenterRegistryToken } from "#core/commands";
import { createContainer, scoped, singleton, type Container } from "#core/di";
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
import { createStoragePort } from "./infra/LocalStorage";
import { ActivityBarRegistry } from "./model/ActivityBarRegistry";
import { ActivityModel } from "./model/ActivityModel";
import { SidebarContentRegistry } from "./model/SidebarContentRegistry";
import { TabContentRegistry } from "./model/TabContentRegistry";
import { TabsModel } from "./model/TabsModel";
import { ThemeModel } from "./model/ThemeModel";
import { ShellViewModel } from "./viewmodel/ShellViewModel";
import {
  ActivityBarRegistryToken,
  ActivityModelToken,
  ShellViewModelToken,
  SidebarContentRegistryToken,
  StorageToken,
  TabContentRegistryToken,
  TabDirtyStateToken,
  TabsModelToken,
  ThemeModelToken,
  WorkbenchStartupToken,
} from "./tokens";

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
  const isTypingSurface = (): boolean => {
    const active = document.activeElement;
    if (active === null) return false;
    if (active.tagName === "INPUT" || active.tagName === "TEXTAREA") return true;
    return (active as HTMLElement).isContentEditable;
  };

  container.register(WorkspaceFilesToken, singleton(createWorkspaceFilesPort));
  container.register(WorkspaceWatchToken, singleton(createWorkspaceWatchPort));
  container.register(StorageToken, singleton(createStoragePort));
  container.register(CommandCenterRegistryToken, singleton(() => new CommandCenterRegistry()));
  container.register(ActivityBarRegistryToken, singleton(() => new ActivityBarRegistry()));
  container.register(SidebarContentRegistryToken, singleton(() => new SidebarContentRegistry()));
  container.register(TabContentRegistryToken, singleton(() => new TabContentRegistry()));

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
      onDidChange: (listener: () => void) =>
        c.resolve(FileContentViewModelToken).onDidChange(listener),
    })),
  );
  // 셸이 뜨고 질 때 켜고 끌 것. 지금은 파일 감시 하나다 — 셸은 무엇이 켜지는지 모른다.
  container.register(
    WorkbenchStartupToken,
    scoped((c) => ({
      start: () => c.resolve(FileContentViewModelToken).startWatching(),
      stop: () => c.resolve(FileContentViewModelToken).stopWatching(),
    })),
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
          commandCenterRegistry: c.resolve(CommandCenterRegistryToken),
          copyToClipboard,
        }),
    ),
  );

  // 세 Registry 전부 singleton이라 루트에서 한 번만 채운다.
  container.resolve(ActivityBarRegistryToken).add({ id: EXPLORER_ID, title: "탐색기", iconId: "files" });
  container.resolve(SidebarContentRegistryToken).add({ id: EXPLORER_ID, PanelComponent: DirectoryTreeView });
  container.resolve(TabContentRegistryToken).add({
    id: FILE_TAB_KIND,
    iconId: "fileCode",
    TabComponent: ({ tabId }) => <FileContentView path={tabId} />,
  });

  return container;
}
