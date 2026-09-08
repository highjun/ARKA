import { createToken } from "#core/di";
import type { IDirectoryTreeModel } from "./model/IDirectoryTreeModel";
import type { IFileContentModel } from "./model/IFileContentModel";
import type { IWorkspaceFiles } from "./model/IWorkspaceFiles";
import type { IWorkspaceWatch } from "./model/IWorkspaceWatch";
import type { IPinTab } from "./model/IPinTab";
import type { IDirectoryTreeViewModel } from "./viewmodel/IDirectoryTreeViewModel";
import type { IFileContentViewModel } from "./viewmodel/IFileContentViewModel";

export const WorkspaceFilesToken = createToken<IWorkspaceFiles>("workspaceFiles");
export const WorkspaceWatchToken = createToken<IWorkspaceWatch>("workspaceWatch");
export const PinTabToken = createToken<IPinTab>("pinTab");

export const DirectoryTreeModelToken = createToken<IDirectoryTreeModel>("directoryTreeModel");
export const FileContentModelToken = createToken<IFileContentModel>("fileContentModel");

export const DirectoryTreeViewModelToken =
  createToken<IDirectoryTreeViewModel>("directoryTreeViewModel");
export const FileContentViewModelToken =
  createToken<IFileContentViewModel>("fileContentViewModel");
