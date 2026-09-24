import { URI } from "#contracts";
import type { Disposable } from "#core/di";
import { makeAutoObservable, observable, observableRef, runInAction } from "mobx";
import type { DirectoryMap, IDirectoryTreeModel } from "../model/IDirectoryTreeModel";
import type { ICommandService } from "#core/commands";
import type {
  ContextMenuTarget,
  IDirectoryTreeViewModel,
  EditingEntry,
  FileTreeRow,
  MovedEntry,
} from "./IDirectoryTreeViewModel";
import { GHOST_ID } from "./share";

export class DirectoryTreeViewModel implements IDirectoryTreeViewModel {
  readonly #model: IDirectoryTreeModel;
  readonly #subscription: Disposable;
  private rowsState: readonly FileTreeRow[];
  private expandedIdsState: readonly string[];
  private selectedIdsState: readonly string[];
  private statusState: IDirectoryTreeViewModel["status"];
  private failureState: string | null;

  private contextTargetState: ContextMenuTarget | null = null;
  private contextTargetsState: readonly ContextMenuTarget[];
  private editingEntryState: EditingEntry | null = null;
  private deleteTargetsState: readonly ContextMenuTarget[] = [];
  private failureNoticeState: string | null = null;

  readonly #copyToClipboard: (text: string) => void;
  readonly #isTypingSurface: () => boolean;
  readonly #commands: ICommandService;

  constructor({
    directoryTreeModel,
    commandCenterRegistry,
    copyToClipboard,
    isTypingSurface,
  }: {
    directoryTreeModel: IDirectoryTreeModel;
    commandCenterRegistry: ICommandService;
    copyToClipboard: (text: string) => void;
    isTypingSurface: () => boolean;
  }) {
    this.#copyToClipboard = copyToClipboard;
    this.#isTypingSurface = isTypingSurface;
    this.#commands = commandCenterRegistry;
    this.#model = directoryTreeModel;
    this.rowsState = this.#computeRows();
    this.expandedIdsState = directoryTreeModel.expanded;
    this.selectedIdsState = directoryTreeModel.selected;
    this.statusState = this.#computeStatus();
    this.failureState = this.#computeFailure();
    this.contextTargetsState = this.#computeContextTargets();

    this.#subscription = directoryTreeModel.onDidChange(() => this.recompute());
    makeAutoObservable<
      this,
      | "rowsState"
      | "expandedIdsState"
      | "selectedIdsState"
      | "statusState"
      | "failureState"
      | "contextTargetState"
      | "contextTargetsState"
      | "editingEntryState"
      | "deleteTargetsState"
      | "failureNoticeState"
    >(
      this,
      {
        rowsState: observableRef,
        expandedIdsState: observableRef,
        selectedIdsState: observableRef,
        statusState: observable,
        failureState: observable,
        contextTargetState: observableRef,
        contextTargetsState: observableRef,
        editingEntryState: observableRef,
        deleteTargetsState: observableRef,
        failureNoticeState: observable,
      },
      { autoBind: true },
    );

    this.#registerFilesystemCommands(commandCenterRegistry);

    this.start();
    this.startWatching();
  }

  get rows(): readonly FileTreeRow[] {
    return this.rowsState;
  }

  get expandedIds(): readonly string[] {
    return this.expandedIdsState;
  }

  get selectedIds(): readonly string[] {
    return this.selectedIdsState;
  }

  get status() {
    return this.statusState;
  }

  get failure(): string | null {
    return this.failureState;
  }

  start(): void {
    void this.#model.load();
  }

  setFolderExpanded(id: string, expanded: boolean): void {
    void this.#model.setExpanded(id, expanded);
  }

  setSelection(ids: readonly string[]): void {
    this.#model.setSelection(ids);
  }

  findRow(id: string): FileTreeRow | undefined {
    const search = (rows: readonly FileTreeRow[]): FileTreeRow | undefined => {
      for (const row of rows) {
        if (row.id === id) return row;
        const found = row.children === undefined ? undefined : search(row.children);
        if (found !== undefined) return found;
      }
      return undefined;
    };
    return search(this.rowsState);
  }

  createEntry(parentId: string, name: string, type: "folder" | "file"): Promise<void> {
    return this.#model.createEntry(parentId, name, type === "folder" ? "dir" : "file");
  }

  renameEntry(id: string, newName: string): Promise<void> {
    return this.#model.renameEntry(id, newName);
  }

  openFile(path: string): void {
    this.#commands.execute("arka.workbench.open", { uri: URI.file(path), preview: true });
  }

  pinFile(path: string): void {
    this.#commands.execute("arka.workbench.open", { uri: URI.file(path), preview: false });
  }

  retargetTabs(oldPath: string, newPath: string): void {
    this.#commands.execute("arka.workbench.retargetTabs", { oldPrefix: oldPath, newPrefix: newPath });
  }

  removeEntry(id: string): Promise<void> {
    return this.#model.removeEntry(id);
  }

  async removeEntries(ids: readonly string[]): Promise<void> {
    const roots = ids.filter((id) => !ids.some((other) => other !== id && id.startsWith(`${other}/`)));
    for (const id of roots) await this.#model.removeEntry(id);
  }

  /** 옮긴 뒤에는 옮긴 것들을 선택해 두고 목적지 폴더를 펼친다 — 어디로 갔는지 눈으로 좇게. */
  async moveEntries(ids: readonly string[], toParentId: string): Promise<readonly MovedEntry[]> {
    const moved: MovedEntry[] = [];
    for (const id of ids) {
      try {
        const to = await this.#model.moveToFolder(id, toParentId);
        moved.push({ from: id, to });
        this.retargetTabs(id, to);
      } catch (error) {
        this.#reportFailure("옮기지 못했다")(error);
      }
    }
    if (moved.length === 0) return moved;
    if (toParentId !== "") this.setFolderExpanded(toParentId, true);
    this.setSelection(moved.map((entry) => entry.to));
    return moved;
  }

  startWatching(): void {
    this.#model.startWatching();
  }

  stopWatching(): void {
    this.#model.stopWatching();
  }

  get contextTarget(): ContextMenuTarget | null {
    return this.contextTargetState;
  }

  get contextTargets(): readonly ContextMenuTarget[] {
    return this.contextTargetsState;
  }

  setContextTarget(target: ContextMenuTarget | null): void {
    this.contextTargetState = target;
    this.recompute();
  }

  get editingId(): string | undefined {
    const editing = this.editingEntryState;
    if (editing === null) return undefined;
    return editing.kind === "rename" ? editing.id : GHOST_ID;
  }

  requestNewFile(): void {
    this.startCreating("newFile");
  }

  requestNewFolder(): void {
    this.startCreating("newFolder");
  }

  private startCreating(kind: "newFile" | "newFolder"): void {
    const parentId = this.#parentIdFor(this.contextTargetState);
    if (parentId !== "") void this.#model.setExpanded(parentId, true);
    this.editingEntryState = { kind, parentId };
    this.recompute();
  }

  requestRename(): void {
    const target = this.contextTargetState;
    if (target === null) return;
    this.editingEntryState = { kind: "rename", id: target.id, initialValue: target.name };
    this.recompute();
  }

  onEditCommit(value: string): void {
    const editing = this.editingEntryState;
    this.editingEntryState = null;
    this.recompute();
    if (editing === null) return;

    const name = value.trim();
    if (name === "") return;

    if (editing.kind === "rename") {
      if (name !== editing.initialValue)
        this.renameEntry(editing.id, name).catch(this.#reportFailure("이름을 바꾸지 못했다"));
      return;
    }
    this.createEntry(editing.parentId, name, editing.kind === "newFile" ? "file" : "folder").catch(
      this.#reportFailure("만들지 못했다"),
    );
  }

  onEditCancel(): void {
    this.editingEntryState = null;
    this.recompute();
  }

  get deleteTargets(): readonly ContextMenuTarget[] {
    return this.deleteTargetsState;
  }

  requestDelete(): void {
    this.deleteTargetsState = this.contextTargetsState;
  }

  confirmDelete(): void {
    const targets = this.deleteTargetsState;
    this.deleteTargetsState = [];
    if (targets.length === 0) return;
    this.removeEntries(targets.map((target) => target.id)).catch(this.#reportFailure("지우지 못했다"));
  }

  cancelDelete(): void {
    this.deleteTargetsState = [];
  }

  get failureNotice(): string | null {
    return this.failureNoticeState;
  }

  dismissFailureNotice(): void {
    this.failureNoticeState = null;
  }

  #registerFilesystemCommands(commandCenterRegistry: ICommandService): void {
    const toContextMenuTarget = (row: FileTreeRow): ContextMenuTarget => ({
      id: row.id,
      name: row.name,
      type: row.type,
    });

    const isContextMenuTarget = (value: unknown): value is ContextMenuTarget =>
      typeof value === "object" && value !== null && "id" in value && "name" in value && "type" in value;

    const targetOf = (context: unknown): ContextMenuTarget | null => {
      if (isContextMenuTarget(context)) return context;
      const ids = this.selectedIds;
      if (ids.length === 0) return null;
      const row = this.findRow(ids[0]!);
      return row === undefined ? null : toContextMenuTarget(row);
    };

    commandCenterRegistry.actions.add({
      id: "filesystem.delete",
      label: "탐색기: 선택한 항목 삭제",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.setContextTarget(target);
        this.requestDelete();
      },
    });
    commandCenterRegistry.keybindings.add({
      keybinding: "delete",
      actionId: "filesystem.delete",
      when: () => !this.#isTypingSurface(),
    });

    commandCenterRegistry.actions.add({
      id: "filesystem.rename",
      label: "탐색기: 선택한 항목 이름 바꾸기",
      execute: (context) => {
        if (context === undefined && this.selectedIds.length !== 1) return;
        const target = targetOf(context);
        if (target === null) return;
        this.setContextTarget(target);
        this.requestRename();
      },
    });
    commandCenterRegistry.keybindings.add({
      keybinding: "f2",
      actionId: "filesystem.rename",
      when: () => !this.#isTypingSurface(),
    });

    commandCenterRegistry.actions.add({
      id: "filesystem.newFile",
      label: "탐색기: 새 파일 만들기",
      execute: (context) => {
        this.setContextTarget(targetOf(context));
        this.requestNewFile();
      },
    });

    commandCenterRegistry.actions.add({
      id: "filesystem.newFolder",
      label: "탐색기: 새 폴더 만들기",
      execute: (context) => {
        this.setContextTarget(targetOf(context));
        this.requestNewFolder();
      },
    });

    commandCenterRegistry.actions.add({
      id: "filesystem.copyPath",
      label: "탐색기: 경로 복사",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.#copyToClipboard(target.id);
      },
    });

    commandCenterRegistry.menus.add({
      menuId: "filesystem.explorer.context",
      actionId: "filesystem.newFile",
      order: 0,
    });
    commandCenterRegistry.menus.add({
      menuId: "filesystem.explorer.context",
      actionId: "filesystem.newFolder",
      order: 1,
    });
    commandCenterRegistry.menus.add({ menuId: "filesystem.explorer.context", actionId: "filesystem.rename", order: 2 });
    commandCenterRegistry.menus.add({
      menuId: "filesystem.explorer.context",
      actionId: "filesystem.copyPath",
      order: 3,
    });
    commandCenterRegistry.menus.add({ menuId: "filesystem.explorer.context", actionId: "filesystem.delete", order: 4 });
  }

  #parentIdFor(target: ContextMenuTarget | null): string {
    if (target === null) return "";
    if (target.type === "folder") return target.id;
    const slash = target.id.lastIndexOf("/");
    return slash === -1 ? "" : target.id.slice(0, slash);
  }

  #reportFailure(verb: string): (error: unknown) => void {
    return (error) => {
      runInAction(() => {
        this.failureNoticeState = `${verb} — ${error instanceof Error ? error.message : String(error)}`;
      });
    };
  }

  #toContextMenuTarget(row: FileTreeRow): ContextMenuTarget {
    return { id: row.id, name: row.name, type: row.type };
  }

  #childrenOf(directories: DirectoryMap, expanded: ReadonlySet<string>, path: string): readonly FileTreeRow[] {
    const node = directories[path];
    if (node === undefined) return [];

    return node.entries.map((entry) => {
      const id = path === "" ? entry.name : `${path}/${entry.name}`;
      if (entry.type === "file") return { id, name: entry.name, type: "file" as const };
      return {
        id,
        name: entry.name,
        type: "folder" as const,
        loading: expanded.has(id) && directories[id]?.status === "loading",
        children: this.#folderChildren(directories, expanded, id),
      };
    });
  }

  #folderChildren(directories: DirectoryMap, expanded: ReadonlySet<string>, id: string): readonly FileTreeRow[] {
    const node = directories[id];
    if (node === undefined) return [];
    if (node.status === "error") {
      return [{ id: `${id}/…`, name: node.failure ?? "읽지 못했다", type: "file", disabled: true }];
    }
    return this.#childrenOf(directories, expanded, id);
  }

  #withEditingGhost(rows: readonly FileTreeRow[], editing: EditingEntry | null): readonly FileTreeRow[] {
    if (editing === null || editing.kind === "rename") return rows;
    const ghost: FileTreeRow = { id: GHOST_ID, name: "", type: "file" };
    if (editing.parentId === "") return [...rows, ghost];
    return rows.map((row) => {
      if (row.id === editing.parentId) return { ...row, children: [...(row.children ?? []), ghost] };
      if (row.children === undefined) return row;
      return { ...row, children: this.#withEditingGhost(row.children, editing) };
    });
  }

  dispose(): void {
    this.#subscription.dispose();
    this.stopWatching();
  }

  private recompute(): void {
    this.rowsState = this.#computeRows();
    this.expandedIdsState = this.#model.expanded;
    this.selectedIdsState = this.#model.selected;
    this.statusState = this.#computeStatus();
    this.failureState = this.#computeFailure();
    this.contextTargetsState = this.#computeContextTargets();
  }

  #computeRows(): readonly FileTreeRow[] {
    return this.#withEditingGhost(
      this.#childrenOf(this.#model.directories, new Set(this.#model.expanded), ""),
      this.editingEntryState,
    );
  }

  #computeStatus() {
    return this.#model.directories[""]?.status ?? "idle";
  }

  #computeFailure(): string | null {
    return this.#model.directories[""]?.failure ?? null;
  }

  #computeContextTargets(): readonly ContextMenuTarget[] {
    const target = this.contextTargetState;
    if (target === null) return [];
    const selectedIds = this.#model.selected;
    if (!selectedIds.includes(target.id)) return [target];
    return selectedIds.flatMap((id) => {
      const row = id === target.id ? target : this.findRow(id);
      return row === undefined ? [] : [this.#toContextMenuTarget(row)];
    });
  }
}
