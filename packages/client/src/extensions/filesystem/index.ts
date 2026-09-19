import type { ExtensionModule } from "#core/extensions";
import { createWorkspaceFilesPort } from "./infra/HttpWorkspaceFiles";
import { createWorkspaceWatchPort } from "./infra/HttpWorkspaceWatch";
import { DirectoryTreeModel } from "./model/DirectoryTreeModel";
import { FileContentModel } from "./model/FileContentModel";
import { DirectoryTreeView } from "./view/DirectoryTreeView";
import { createTextTabProvider } from "./view/textTabProvider";
import { DirectoryTreeViewModel } from "./viewmodel/DirectoryTreeViewModel";
import { FileContentViewModel } from "./viewmodel/FileContentViewModel";

export { type IWorkspaceFiles } from "./model/IWorkspaceFiles";

/** 탐색기 사이드바의 id. 다른 확장이 알 필요는 없다 — 여는 것은 `arka.filesystem.focus` 명령이다. */
const EXPLORER_ID = "explorer";

// 브라우저 API를 얇은 함수로 감싸 넣는다 — Model·ViewModel이 navigator·document를 직접 알면 테스트가 DOM에 묶인다.
const copyToClipboard = (text: string): void => {
  void navigator.clipboard.writeText(text);
};
const isTypingSurface = (): boolean => {
  const active = document.activeElement;
  if (active === null) return false;
  if (active.tagName === "INPUT" || active.tagName === "TEXTAREA") return true;
  return (active as HTMLElement).isContentEditable;
};

/**
 * 파일시스템 확장 — 탐색기 사이드바와 텍스트 탭. 커널과 만나는 면이 이 값 하나다.
 *
 * 파일 감시는 `fileContentViewModel`이 만들어지는 순간 켜진다 — `activate`에서 꺼내는 것이 곧 켜는 것이다.
 */
export const filesystem: ExtensionModule = {
  id: "arka.filesystem",
  provides: [
    { id: "arka.filesystem.workspaceFiles", lifetime: "singleton", create: createWorkspaceFilesPort },
    { id: "arka.filesystem.workspaceWatch", lifetime: "singleton", create: createWorkspaceWatchPort },
    {
      id: "arka.filesystem.directoryTreeModel",
      lifetime: "singleton",
      create: (c) =>
        new DirectoryTreeModel({
          workspaceFiles: c.resolve("arka.filesystem.workspaceFiles"),
          workspaceWatch: c.resolve("arka.filesystem.workspaceWatch"),
        }),
    },
    {
      id: "arka.filesystem.fileContentModel",
      lifetime: "singleton",
      create: (c) =>
        new FileContentModel({
          workspaceFiles: c.resolve("arka.filesystem.workspaceFiles"),
          workspaceWatch: c.resolve("arka.filesystem.workspaceWatch"),
        }),
    },
    {
      id: "arka.filesystem.directoryTreeViewModel",
      lifetime: "singleton",
      create: (c) =>
        new DirectoryTreeViewModel({
          directoryTreeModel: c.resolve("arka.filesystem.directoryTreeModel"),
          commandCenterRegistry: c.resolve("arka.commands"),
          copyToClipboard,
          isTypingSurface,
        }),
    },
    {
      id: "arka.filesystem.fileContentViewModel",
      lifetime: "singleton",
      create: (c) =>
        new FileContentViewModel({
          fileContentModel: c.resolve("arka.filesystem.fileContentModel"),
          commandCenterRegistry: c.resolve("arka.commands"),
        }),
    },
  ],
  activate: (c) => {
    c.resolve("arka.workbench.sidebar").add({
      id: EXPLORER_ID,
      title: "탐색기",
      iconId: "files",
      Content: DirectoryTreeView,
      actions: [
        { actionId: "filesystem.newFile", iconId: "newFile" },
        { actionId: "filesystem.newFolder", iconId: "newFolder" },
      ],
    });
    // 텍스트 탭 provider — 여는 쪽이 자기 ViewModel을 그때 꺼낸다.
    c.resolve("arka.workbench.tabSystem").add(
      createTextTabProvider({
        get fileContent() {
          return c.resolve("arka.filesystem.fileContentViewModel");
        },
      }),
    );
    const commands = c.resolve("arka.commands");
    commands.actions.add({
      id: "arka.filesystem.focus",
      label: "탐색기 보기",
      execute: () => commands.execute("arka.workbench.revealSidebar", { id: EXPLORER_ID }),
    });
    commands.keybindings.add({ keybinding: "ctrl+shift+e", actionId: "arka.filesystem.focus" });
    // 파일 감시와 탐색기 명령(삭제·이름 바꾸기…)은 ViewModel이 만들어지는 순간 켜진다.
    c.resolve("arka.filesystem.fileContentViewModel");
    c.resolve("arka.filesystem.directoryTreeViewModel");
  },
};
