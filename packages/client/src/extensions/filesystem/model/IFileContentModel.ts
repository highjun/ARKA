import type { Disposable } from "#core/di";

type FileStatus = "loading" | "loaded" | "error";
type SaveStatus = "idle" | "saving" | "error";

export type OpenFile = {
  readonly path: string;
  readonly status: FileStatus;
  readonly savedContent: string;
  readonly content: string;
  readonly truncated: boolean;
  readonly binary: boolean;
  readonly failure: string | null;
  readonly saveStatus: SaveStatus;
  readonly saveFailure: string | null;
};

export type OpenFileMap = Readonly<Record<string, OpenFile>>;

declare module "#core/di" {
  interface InstanceMap {
    "arka.filesystem.fileContentModel": IFileContentModel;
  }
}
export interface IFileContentModel {
  readonly files: OpenFileMap;
  open(path: string): Promise<void>;
  reload(path: string): Promise<void>;
  close(path: string): void;
  edit(path: string, content: string): void;
  save(path: string): Promise<void>;
  retargetOpenFile(oldPrefix: string, newPrefix: string): void;

  startWatching(): void;
  stopWatching(): void;

  onDidChange(listener: () => void): Disposable;
}
