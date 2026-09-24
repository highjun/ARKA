import type { Disposable } from "#core/di";

export type FileTreeRow = {
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "file";
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly children?: readonly FileTreeRow[];
};

export type DirectoryTreeStatus = "idle" | "loading" | "loaded" | "error";

export type ContextMenuTarget = {
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "file";
};

export type EditingEntry =
  | { readonly kind: "rename"; readonly id: string; readonly initialValue: string }
  | { readonly kind: "newFile" | "newFolder"; readonly parentId: string };

declare module "#core/di" {
  interface InstanceMap {
    "arka.filesystem.directoryTreeViewModel": IDirectoryTreeViewModel;
  }
}
export interface MovedEntry {
  readonly from: string;
  readonly to: string;
}

export interface IDirectoryTreeViewModel extends Disposable {
  readonly rows: readonly FileTreeRow[];
  readonly expandedIds: readonly string[];
  readonly selectedIds: readonly string[];
  readonly status: DirectoryTreeStatus;
  readonly failure: string | null;

  start(): void;
  setFolderExpanded(id: string, expanded: boolean): void;
  setSelection(ids: readonly string[]): void;
  findRow(id: string): FileTreeRow | undefined;

  createEntry(parentId: string, name: string, type: "folder" | "file"): Promise<void>;
  renameEntry(id: string, newName: string): Promise<void>;
  removeEntry(id: string): Promise<void>;
  removeEntries(ids: readonly string[]): Promise<void>;
  /** 순서대로 옮기고 (옛 경로 → 새 경로) 짝을 돌려준다. 실패한 것은 빠진다. */
  moveEntries(ids: readonly string[], toParentId: string): Promise<readonly MovedEntry[]>;

  openFile(path: string): void;
  pinFile(path: string): void;
  retargetTabs(oldPath: string, newPath: string): void;

  startWatching(): void;
  stopWatching(): void;

  readonly contextTarget: ContextMenuTarget | null;
  readonly contextTargets: readonly ContextMenuTarget[];
  setContextTarget(target: ContextMenuTarget | null): void;

  readonly editingId: string | undefined;
  requestNewFile(): void;
  requestNewFolder(): void;
  requestRename(): void;
  onEditCommit(value: string): void;
  onEditCancel(): void;

  readonly deleteTargets: readonly ContextMenuTarget[];
  requestDelete(): void;
  confirmDelete(): void;
  cancelDelete(): void;

  readonly failureNotice: string | null;
  dismissFailureNotice(): void;
}
