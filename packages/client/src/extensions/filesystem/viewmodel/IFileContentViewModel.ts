import type { Disposable } from "#core/di";

export type FileRow = {
  readonly content: string;
  readonly notice: string | null;
  readonly readOnly: boolean;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly loading: boolean;
};

export type FileRowMap = Readonly<Record<string, FileRow>>;

export type RevealRequest = { readonly line: number; readonly column: number; readonly seq: number };

declare module "#core/di" {
  interface InstanceMap {
    "arka.filesystem.fileContentViewModel": IFileContentViewModel;
  }
}
export interface IFileContentViewModel extends Disposable {
  readonly rows: FileRowMap;
  onDidChange(listener: () => void): Disposable;
  openFile(path: string): Promise<boolean>;
  readonly reveals: Readonly<Record<string, RevealRequest>>;
  revealAt(path: string, position: { readonly line: number; readonly column: number }): void;
  editFile(path: string, content: string): void;
  saveFile(path: string): void;
  retargetOpenFile(oldPrefix: string, newPrefix: string): void;
}
