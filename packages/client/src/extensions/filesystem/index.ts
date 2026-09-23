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

const EXPLORER_ID = "explorer";

const copyToClipboard = (text: string): void => {
  void navigator.clipboard.writeText(text);
};
const isTypingSurface = (): boolean => {
  const active = document.activeElement;
  if (active === null) return false;
  if (active.tagName === "INPUT" || active.tagName === "TEXTAREA") return true;
  return (active as HTMLElement).isContentEditable;
};

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
    });
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
    c.resolve("arka.filesystem.fileContentViewModel");
    c.resolve("arka.filesystem.directoryTreeViewModel");
  },
};
