import type { DirectoryListing, FileContent, FileEntry, FileEntryType } from "#contracts";

export type { DirectoryListing, FileContent, FileEntry, FileEntryType };

declare module "#core/di" {
  interface InstanceMap {
    "arka.filesystem.workspaceFiles": IWorkspaceFiles;
  }
}
export interface IWorkspaceFiles {
  list(path: string): Promise<DirectoryListing>;
  read(path: string): Promise<FileContent>;
  write(path: string, content: string): Promise<void>;
  create(path: string, type: FileEntryType): Promise<void>;
  move(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
}
