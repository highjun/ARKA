import type { Disposable } from "#core/di";
import type { FileEntry, FileEntryType } from "../model/IWorkspaceFiles";

type DirectoryStatus = "idle" | "loading" | "loaded" | "error";

type DirectoryNode = {
  readonly status: DirectoryStatus;
  readonly entries: readonly FileEntry[];
  readonly failure: string | null;
};

export type DirectoryMap = Readonly<Record<string, DirectoryNode>>;

declare module "#core/di" {
  interface InstanceMap {
    "arka.filesystem.directoryTreeModel": IDirectoryTreeModel;
  }
}
export interface IDirectoryTreeModel {
  readonly directories: DirectoryMap;
  readonly expanded: readonly string[];
  readonly selected: readonly string[];

  load(): Promise<void>;
  setExpanded(path: string, expanded: boolean): Promise<void>;
  setSelection(paths: readonly string[]): void;

  createEntry(parentPath: string, name: string, type: FileEntryType): Promise<void>;
  renameEntry(path: string, newName: string): Promise<void>;
  removeEntry(path: string): Promise<void>;
  moveToFolder(path: string, toParentPath: string): Promise<string>;

  startWatching(): void;
  stopWatching(): void;

  onDidChange(listener: () => void): Disposable;
}
