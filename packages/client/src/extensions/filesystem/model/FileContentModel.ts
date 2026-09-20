import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IWorkspaceFiles } from "../model/IWorkspaceFiles";
import type { IWorkspaceWatch, WorkspaceWatchUnsubscribe } from "../model/IWorkspaceWatch";
import type { IFileContentModel, OpenFile, OpenFileMap } from "./IFileContentModel";

export class FileContentModel implements IFileContentModel {
  static readonly #WATCH_DEBOUNCE_MS = 300;

  readonly #files: IWorkspaceFiles;
  readonly #watch: IWorkspaceWatch;
  #open: OpenFileMap = {};

  #watching = false;
  #watchedPaths: readonly string[] = [];
  #unwatch: WorkspaceWatchUnsubscribe | undefined;
  #watchDebounce: ReturnType<typeof setTimeout> | undefined;

  constructor({
    workspaceFiles,
    workspaceWatch,
  }: {
    workspaceFiles: IWorkspaceFiles;
    workspaceWatch: IWorkspaceWatch;
  }) {
    this.#files = workspaceFiles;
    this.#watch = workspaceWatch;
  }

  get files(): OpenFileMap {
    return this.#open;
  }

  async open(path: string): Promise<void> {
    const known = this.#open[path];
    if (known !== undefined && known.status !== "error") return;
    await this.reload(path);
    this.#rewatch();
  }

  async reload(path: string): Promise<void> {
    this.#write({
      path,
      status: "loading",
      savedContent: "",
      content: "",
      truncated: false,
      binary: false,
      failure: null,
      saveStatus: "idle",
      saveFailure: null,
    });
    try {
      const file = await this.#files.read(path);
      this.#write({
        path,
        status: "loaded",
        savedContent: file.content,
        content: file.content,
        truncated: file.truncated,
        binary: file.encoding === "binary",
        failure: null,
        saveStatus: "idle",
        saveFailure: null,
      });
    } catch (error) {
      this.#write({
        path,
        status: "error",
        savedContent: "",
        content: "",
        truncated: false,
        binary: false,
        failure: error instanceof Error ? error.message : String(error),
        saveStatus: "idle",
        saveFailure: null,
      });
    }
  }

  close(path: string): void {
    this.#setOpen(Object.fromEntries(Object.entries(this.#open).filter(([open]) => open !== path)));
    this.#rewatch();
  }

  edit(path: string, content: string): void {
    const file = this.#editable(path);
    if (file === undefined) return;
    this.#write({ ...file, content });
  }

  async save(path: string): Promise<void> {
    const file = this.#editable(path);
    if (file === undefined || file.saveStatus === "saving" || file.content === file.savedContent) return;

    const sent = file.content;
    this.#write({ ...file, saveStatus: "saving", saveFailure: null });
    try {
      await this.#files.write(path, sent);
      const latest = this.#open[path];
      if (latest === undefined) return;
      this.#write({ ...latest, savedContent: sent, saveStatus: "idle", saveFailure: null });
    } catch (error) {
      const latest = this.#open[path];
      if (latest === undefined) return;
      this.#write({
        ...latest,
        saveStatus: "error",
        saveFailure: error instanceof Error ? error.message : String(error),
      });
    }
  }

  retargetOpenFile(oldPrefix: string, newPrefix: string): void {
    const retarget = (path: string): string => {
      if (path === oldPrefix) return newPrefix;
      if (path.startsWith(`${oldPrefix}/`)) return `${newPrefix}${path.slice(oldPrefix.length)}`;
      return path;
    };

    const open = this.#open;
    const next: Record<string, OpenFile> = {};
    let changed = false;
    for (const [path, file] of Object.entries(open)) {
      const newPath = retarget(path);
      if (newPath !== path) changed = true;
      next[newPath] = newPath === path ? file : { ...file, path: newPath };
    }
    if (changed) this.#setOpen(next);
  }

  startWatching(): void {
    this.#watching = true;
    this.#rewatch();
  }

  stopWatching(): void {
    this.#watching = false;
    if (this.#watchDebounce !== undefined) clearTimeout(this.#watchDebounce);
    this.#watchDebounce = undefined;
    this.#unwatch?.();
    this.#unwatch = undefined;
    this.#watchedPaths = [];
  }

  #rewatch(): void {
    if (!this.#watching) return;
    if (this.#watchDebounce !== undefined) clearTimeout(this.#watchDebounce);

    this.#watchDebounce = setTimeout(() => {
      this.#watchDebounce = undefined;
      const paths = Object.keys(this.#open);
      if (FileContentModel.#sameSet(paths, this.#watchedPaths)) return;

      this.#unwatch?.();
      this.#watchedPaths = paths;
      this.#unwatch = this.#watch.watch(paths, (changed) => {
        for (const path of changed) {
          const file = this.#open[path];
          if (file === undefined) continue;
          if (file.content !== file.savedContent) continue;
          void this.reload(path);
        }
      });
    }, FileContentModel.#WATCH_DEBOUNCE_MS);
  }

  static #sameSet(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    const sorted = [...b].sort();
    return [...a].sort().every((value, index) => value === sorted[index]);
  }

  #editable(path: string): OpenFile | undefined {
    const file = this.#open[path];
    if (file === undefined || file.status !== "loaded" || file.truncated || file.binary) return undefined;
    return file;
  }

  #write(file: OpenFile): void {
    this.#setOpen({ ...this.#open, [file.path]: file });
  }

  readonly #changed = new Emitter();

  #setOpen(next: OpenFileMap): void {
    if (this.#open === next) return;
    this.#open = next;
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
