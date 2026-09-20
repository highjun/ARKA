import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { FileEntryType, IWorkspaceFiles } from "../model/IWorkspaceFiles";
import type { IWorkspaceWatch, WorkspaceWatchUnsubscribe } from "../model/IWorkspaceWatch";
import type { DirectoryMap, IDirectoryTreeModel } from "./IDirectoryTreeModel";

export class DirectoryTreeModel implements IDirectoryTreeModel {
  static readonly #PREFETCH_LIMIT = 24;

  static readonly #PREFETCH_CONCURRENCY = 3;

  static readonly #WATCH_DEBOUNCE_MS = 300;

  readonly #files: IWorkspaceFiles;
  readonly #watch: IWorkspaceWatch;

  #directories: DirectoryMap = {};
  #expanded: readonly string[] = [];
  #selected: readonly string[] = [];

  readonly #inFlight = new Map<string, Promise<void>>();

  #prefetchGeneration = 0;

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

  get directories(): DirectoryMap {
    return this.#directories;
  }

  get expanded(): readonly string[] {
    return this.#expanded;
  }

  get selected(): readonly string[] {
    return this.#selected;
  }

  async load(): Promise<void> {
    await this.#read("");
    this.#prefetchChildren("");
    this.#rewatch();
  }

  async setExpanded(path: string, expanded: boolean): Promise<void> {
    const open = this.#expanded;
    if (!expanded) {
      this.#setExpanded(open.filter((each) => each !== path));
      this.#rewatch();
      return;
    }

    if (!open.includes(path)) this.#setExpanded([...open, path]);
    await this.#read(path);
    this.#prefetchChildren(path);
    this.#rewatch();
  }

  setSelection(paths: readonly string[]): void {
    this.#setSelected(paths);
  }

  async createEntry(parentPath: string, name: string, type: FileEntryType): Promise<void> {
    await this.#files.create(DirectoryTreeModel.#join(parentPath, name), type);
    await this.#refresh(parentPath);
  }

  async renameEntry(path: string, newName: string): Promise<void> {
    const parent = DirectoryTreeModel.#parentOf(path);
    await this.#files.move(path, DirectoryTreeModel.#join(parent, newName));
    await this.#refresh(parent);
  }

  async removeEntry(path: string): Promise<void> {
    await this.#files.remove(path);
    await this.#refresh(DirectoryTreeModel.#parentOf(path));
    this.#setSelected(this.#selected.filter((selected) => !DirectoryTreeModel.#isPathOrDescendant(selected, path)));
  }

  async moveToFolder(path: string, toParentPath: string): Promise<string> {
    const toPath = DirectoryTreeModel.#join(toParentPath, DirectoryTreeModel.#basename(path));
    await this.#files.move(path, toPath);
    const fromParent = DirectoryTreeModel.#parentOf(path);
    await this.#refresh(fromParent);
    if (toParentPath !== fromParent) await this.#refresh(toParentPath);
    return toPath;
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
      const paths = ["", ...this.#expanded];
      if (DirectoryTreeModel.#sameSet(paths, this.#watchedPaths)) return;

      this.#unwatch?.();
      this.#watchedPaths = paths;
      this.#unwatch = this.#watch.watch(paths, (changed) => {
        for (const path of changed) void this.#refresh(path);
      });
    }, DirectoryTreeModel.#WATCH_DEBOUNCE_MS);
  }

  static #sameSet(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    const sorted = [...b].sort();
    return [...a].sort().every((value, index) => value === sorted[index]);
  }

  async #read(path: string): Promise<void> {
    const known = this.#directories[path];
    if (known?.status === "loaded") return;

    const nagging = this.#inFlight.get(path);
    if (nagging !== undefined) return nagging;

    const request = this.#fetch(path).finally(() => this.#inFlight.delete(path));
    this.#inFlight.set(path, request);
    return request;
  }

  async #refresh(path: string): Promise<void> {
    if (this.#directories[path] === undefined) return;
    await this.#fetch(path);
  }

  async #fetch(path: string): Promise<void> {
    this.#write(path, { status: "loading", entries: this.#directories[path]?.entries ?? [], failure: null });
    try {
      const listing = await this.#files.list(path);
      this.#write(path, { status: "loaded", entries: listing.entries, failure: null });
    } catch (error) {
      this.#write(path, {
        status: "error",
        entries: [],
        failure: error instanceof Error ? error.message : String(error),
      });
    }
  }

  #prefetchChildren(path: string): void {
    const generation = (this.#prefetchGeneration += 1);
    const queue = (this.#directories[path]?.entries ?? [])
      .filter((entry) => entry.type === "dir")
      .slice(0, DirectoryTreeModel.#PREFETCH_LIMIT)
      .map((entry) => (path === "" ? entry.name : `${path}/${entry.name}`));

    const worker = async (): Promise<void> => {
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        if (generation !== this.#prefetchGeneration) return;
        await this.#read(next);
      }
    };

    for (let slot = 0; slot < DirectoryTreeModel.#PREFETCH_CONCURRENCY; slot += 1) void worker();
  }

  #write(path: string, node: DirectoryMap[string]): void {
    this.#setDirectories({ ...this.#directories, [path]: node });
  }

  static #parentOf(path: string): string {
    const slash = path.lastIndexOf("/");
    return slash === -1 ? "" : path.slice(0, slash);
  }

  static #join(parent: string, name: string): string {
    return parent === "" ? name : `${parent}/${name}`;
  }

  static #basename(path: string): string {
    return path.split("/").pop() ?? path;
  }

  static #isPathOrDescendant(candidate: string, ancestor: string): boolean {
    return candidate === ancestor || candidate.startsWith(`${ancestor}/`);
  }

  readonly #changed = new Emitter();

  #setDirectories(next: DirectoryMap): void {
    if (this.#directories === next) return;
    this.#directories = next;
    this.#changed.fire();
  }

  #setExpanded(next: readonly string[]): void {
    if (this.#expanded === next) return;
    this.#expanded = next;
    this.#changed.fire();
  }

  #setSelected(next: readonly string[]): void {
    if (this.#selected === next) return;
    this.#selected = next;
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
