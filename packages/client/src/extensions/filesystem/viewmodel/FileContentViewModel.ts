import { URI } from "#contracts";
import type { ICommandService } from "#core/commands";
import type { Disposable } from "#core/di";
import { makeAutoObservable, observableRef, reaction } from "mobx";
import type { IFileContentModel, OpenFile } from "../model/IFileContentModel";
import type { IFileContentViewModel, FileRow, FileRowMap, RevealRequest } from "./IFileContentViewModel";

type RevealContext = { readonly uri: URI; readonly line: number; readonly column: number };

const isRevealContext = (value: unknown): value is RevealContext =>
  typeof value === "object" &&
  value !== null &&
  "uri" in value &&
  value.uri instanceof URI &&
  "line" in value &&
  typeof value.line === "number" &&
  "column" in value &&
  typeof value.column === "number";

export class FileContentViewModel implements IFileContentViewModel {
  readonly #model: IFileContentModel;
  private rowsState: FileRowMap;
  private revealsState: Readonly<Record<string, RevealRequest>> = {};
  #revealSeq = 0;
  readonly #subscription: Disposable;

  constructor({
    fileContentModel,
    commandCenterRegistry,
  }: {
    fileContentModel: IFileContentModel;
    commandCenterRegistry: ICommandService;
  }) {
    this.#model = fileContentModel;
    this.rowsState = this.#computeRows();
    this.#subscription = fileContentModel.onDidChange(() => this.syncRows());
    makeAutoObservable<this, "rowsState" | "revealsState">(
      this,
      {
        rowsState: observableRef,
        revealsState: observableRef,
      },
      { autoBind: true },
    );

    fileContentModel.startWatching();

    commandCenterRegistry.actions.add({
      id: "arka.filesystem.reveal",
      label: "파일: 줄·열로 이동",
      execute: (context) => {
        if (!isRevealContext(context) || context.uri.scheme !== "file") return;
        this.revealAt(context.uri.path, context);
      },
    });
  }

  dispose(): void {
    this.#subscription.dispose();
    this.#model.stopWatching();
  }

  #computeRows(): FileRowMap {
    return Object.fromEntries(Object.entries(this.#model.files).map(([path, file]) => [path, this.#toRow(file)]));
  }

  get rows(): FileRowMap {
    return this.rowsState;
  }

  onDidChange(listener: () => void): Disposable {
    const stop = reaction(
      () => this.rowsState,
      () => listener(),
    );
    return { dispose: stop };
  }

  private syncRows(): void {
    this.rowsState = this.#computeRows();
  }

  get reveals(): Readonly<Record<string, RevealRequest>> {
    return this.revealsState;
  }

  revealAt(path: string, position: { readonly line: number; readonly column: number }): void {
    this.#revealSeq += 1;
    this.revealsState = {
      ...this.revealsState,
      [path]: { line: position.line, column: position.column, seq: this.#revealSeq },
    };
  }

  async openFile(path: string): Promise<boolean> {
    await this.#model.open(path);
    const file = this.#model.files[path];
    if (file !== undefined && file.status !== "error" && !file.binary) return true;
    this.#model.close(path);
    return false;
  }

  editFile(path: string, content: string): void {
    this.#model.edit(path, content);
  }

  saveFile(path: string): void {
    void this.#model.save(path);
  }

  retargetOpenFile(oldPrefix: string, newPrefix: string): void {
    this.#model.retargetOpenFile(oldPrefix, newPrefix);
  }

  #toRow(file: OpenFile): FileRow {
    if (file.status === "loading") return this.#locked("", null, true);
    if (file.status === "error") return this.#locked("", file.failure ?? "읽지 못했다", false);
    if (file.binary) return this.#locked("", "텍스트가 아니라 보여줄 수 없다.", false);
    if (file.truncated) return this.#locked(file.content, "파일이 커서 앞부분만 보여준다. 편집할 수 없다.", false);

    return {
      content: file.content,
      notice: this.#saveNotice(file),
      readOnly: false,
      isDirty: file.content !== file.savedContent,
      isSaving: file.saveStatus === "saving",
      loading: false,
    };
  }

  #saveNotice(file: OpenFile): string | null {
    if (file.saveStatus === "error") return `저장하지 못했다 — ${file.saveFailure ?? ""}`;
    return null;
  }

  #locked(content: string, notice: string | null, loading: boolean): FileRow {
    return { content, notice, readOnly: true, isDirty: false, isSaving: false, loading };
  }
}
