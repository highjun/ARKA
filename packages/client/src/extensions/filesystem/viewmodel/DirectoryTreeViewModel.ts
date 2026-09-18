import { URI } from "#contracts";
import type { Disposable } from "#core/di";
import { makeAutoObservable, observable, observableRef, runInAction } from "mobx";
import type { DirectoryMap, IDirectoryTreeModel } from "../model/IDirectoryTreeModel";
import type { ICommandService } from "#core/commands";
import type { ContextMenuTarget, IDirectoryTreeViewModel, EditingEntry, FileTreeRow } from "./IDirectoryTreeViewModel";
import { GHOST_ID } from "./share";

/** `IDirectoryTreeViewModel`을 구현한다 — Model의 평평한 상태를 `computed`로 중첩 트리·컨텍스트 메뉴 대상으로 접는다. */
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

  /** 만들 때 파일 커맨드(삭제·이름변경·새로 만들기)를 스스로 등록한다. */
  constructor({
    directoryTreeModel,
    commandCenterRegistry,
    copyToClipboard,
    isTypingSurface,
  }: {
    directoryTreeModel: IDirectoryTreeModel;
    commandCenterRegistry: ICommandService;
    /** `no-restricted-globals`가 Model/ViewModel의 `navigator` 직접 참조를 막는다 — 조립부
     *  (`registerServices.tsx`, 대상 아님)가 이 얇은 함수를 주입한다. */
    copyToClipboard: (text: string) => void;
    /** 위와 같은 이유로 `document.activeElement` 접근도 조립부가 대신 판정해 함수로 준다. */
    isTypingSurface: () => boolean;
  }) {
    this.#copyToClipboard = copyToClipboard;
    this.#isTypingSurface = isTypingSurface;
    this.#commands = commandCenterRegistry;
    this.#model = directoryTreeModel;
    // Model은 값과 이벤트만 준다 — 파생된 화면 상태는 전부 여기서 소유한다.
    this.rowsState = this.#computeRows();
    this.expandedIdsState = directoryTreeModel.expanded;
    this.selectedIdsState = directoryTreeModel.selected;
    this.statusState = this.#computeStatus();
    this.failureState = this.#computeFailure();
    this.contextTargetsState = this.#computeContextTargets();

    // Model이 바뀔 때 파생값을 다시 만든다. 이 VM 자신의 상태(우클릭 대상·편집 중)가 바뀔 때는 그 setter가 부른다.
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

    // 만들어지는 순간 루트를 읽고 감시를 켠다 — VM은 화면보다 오래 살고, 끄는 것은 컨테이너가 dispose할 때다.
    this.start();
    this.startWatching();
  }

  /** `#rows`를 값으로 노출한다. */
  get rows(): readonly FileTreeRow[] {
    return this.rowsState;
  }

  /** `#expandedIds`를 값으로 노출한다. */
  get expandedIds(): readonly string[] {
    return this.expandedIdsState;
  }

  /** `#selectedIds`를 값으로 노출한다. */
  get selectedIds(): readonly string[] {
    return this.selectedIdsState;
  }

  /** `#status`를 값으로 노출한다. */
  get status() {
    return this.statusState;
  }

  /** `#failure`를 값으로 노출한다. */
  get failure(): string | null {
    return this.failureState;
  }

  /** `#model.load`에 위임한다. */
  start(): void {
    void this.#model.load();
  }

  /** `#model.setExpanded`에 위임한다. */
  setFolderExpanded(id: string, expanded: boolean): void {
    void this.#model.setExpanded(id, expanded);
  }

  /** `#model.setSelection`에 위임한다. */
  setSelection(ids: readonly string[]): void {
    this.#model.setSelection(ids);
  }

  /** `#rows`를 재귀로 훑어 id가 일치하는 행을 찾는다. */
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

  /** 화면 어휘(`'folder'`/`'file'`)를 Model 어휘(`'dir'`/`'file'`)로 바꿔 `#model.createEntry`에 위임한다. */
  createEntry(parentId: string, name: string, type: "folder" | "file"): Promise<void> {
    return this.#model.createEntry(parentId, name, type === "folder" ? "dir" : "file");
  }

  /** `#model.renameEntry`에 위임한다. */
  renameEntry(id: string, newName: string): Promise<void> {
    return this.#model.renameEntry(id, newName);
  }

  /** `arka.workbench.open`을 미리보기로 부른다 — 탭을 어떻게 여는지는 셸의 일이다. */
  openFile(path: string): void {
    this.#commands.execute("arka.workbench.open", { uri: URI.file(path), preview: true });
  }

  /** `arka.workbench.open`을 고정으로 부른다 — 같은 uri가 미리보기 자리에 있으면 그 자리에서 고정된다. */
  pinFile(path: string): void {
    this.#commands.execute("arka.workbench.open", { uri: URI.file(path), preview: false });
  }

  /** `arka.workbench.retargetTabs`를 부른다 — 편집 버퍼는 `IFileContentViewModel.retargetOpenFile`이 따로 옮긴다. */
  retargetTabs(oldPath: string, newPath: string): void {
    this.#commands.execute("arka.workbench.retargetTabs", { oldPrefix: oldPath, newPrefix: newPath });
  }

  /** `#model.removeEntry`에 위임한다. */
  removeEntry(id: string): Promise<void> {
    return this.#model.removeEntry(id);
  }

  /** 후손 경로를 걸러낸 뒤 순차로 `#model.removeEntry`를 부른다. */
  async removeEntries(ids: readonly string[]): Promise<void> {
    // 폴더 하나를 지우면 서버가 그 안의 파일까지 함께 지운다 — 같이 선택된 후손을 또 지우려
    // 들면 이미 없는 경로에 DELETE가 나가 실패한다. 후손을 걸러낸 나머지만 순차로 지운다.
    const roots = ids.filter((id) => !ids.some((other) => other !== id && id.startsWith(`${other}/`)));
    for (const id of roots) await this.#model.removeEntry(id);
  }

  /**
   * 성공하면 옮긴 뒤의 경로를 그대로 돌려준다(View가 열린 탭 재배정에 쓴다). 실패는 여기서
   * `failureNotice`로 옮겨 담고 **다시 던진다** — View가 성공했을 때만 하는 후속 조치(탭 재배정)를
   * 건너뛸 수 있어야 하기 때문이다.
   */
  async moveEntry(id: string, toParentId: string): Promise<string> {
    try {
      return await this.#model.moveToFolder(id, toParentId);
    } catch (error) {
      this.#reportFailure("옮기지 못했다")(error);
      throw error;
    }
  }

  /** `#model.startWatching`에 위임한다. */
  startWatching(): void {
    this.#model.startWatching();
  }

  /** `#model.stopWatching`에 위임한다. */
  stopWatching(): void {
    this.#model.stopWatching();
  }

  /** `#contextTarget`을 값으로 노출한다. */
  get contextTarget(): ContextMenuTarget | null {
    return this.contextTargetState;
  }

  /** `#contextTargets`를 값으로 노출한다. */
  get contextTargets(): readonly ContextMenuTarget[] {
    return this.contextTargetsState;
  }

  /** 우클릭 대상을 반영하고 파생값(대상 묶음)을 다시 만든다. */
  setContextTarget(target: ContextMenuTarget | null): void {
    this.contextTargetState = target;
    this.recompute();
  }

  /** `#editingEntry`에서 `FileTree`가 바로 쓸 수 있는 id 하나로 접는다. */
  get editingId(): string | undefined {
    const editing = this.editingEntryState;
    if (editing === null) return undefined;
    return editing.kind === "rename" ? editing.id : GHOST_ID;
  }

  /** `#editingEntry`를 `newFile`로 채운다 — 부모가 아직 안 펼쳐졌으면 먼저 펼친다(유령 행이
   *  보이려면 그 부모가 펼쳐져 있어야 한다). */
  requestNewFile(): void {
    this.startCreating("newFile");
  }

  /** `#editingEntry`를 `newFolder`로 채운다. */
  requestNewFolder(): void {
    this.startCreating("newFolder");
  }

  private startCreating(kind: "newFile" | "newFolder"): void {
    const parentId = this.#parentIdFor(this.contextTargetState);
    if (parentId !== "") void this.#model.setExpanded(parentId, true);
    this.editingEntryState = { kind, parentId };
    this.recompute();
  }

  /** `contextTarget`의 현재 이름을 초기값으로 `#editingEntry`를 채운다. */
  requestRename(): void {
    const target = this.contextTargetState;
    if (target === null) return;
    this.editingEntryState = { kind: "rename", id: target.id, initialValue: target.name };
    this.recompute();
  }

  /** `#editingEntry.kind`에 따라 `createEntry`/`renameEntry`를 부르고 `#editingEntry`를 비운다. */
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

  /** 편집 중 상태를 비운다. */
  onEditCancel(): void {
    this.editingEntryState = null;
    this.recompute();
  }

  /** `#deleteTargets`를 값으로 노출한다. */
  get deleteTargets(): readonly ContextMenuTarget[] {
    return this.deleteTargetsState;
  }

  /** `#contextTargets`를 `#deleteTargets`에 복사한다. */
  requestDelete(): void {
    this.deleteTargetsState = this.contextTargetsState;
  }

  /** `#deleteTargets`를 비우고 `removeEntries`를 부른다. */
  confirmDelete(): void {
    const targets = this.deleteTargetsState;
    this.deleteTargetsState = [];
    if (targets.length === 0) return;
    this.removeEntries(targets.map((target) => target.id)).catch(this.#reportFailure("지우지 못했다"));
  }

  /** `#deleteTargets`를 비운다. */
  cancelDelete(): void {
    this.deleteTargetsState = [];
  }

  /** `#failureNotice`를 값으로 노출한다. */
  get failureNotice(): string | null {
    return this.failureNoticeState;
  }

  /** `#failureNotice`를 비운다. */
  dismissFailureNotice(): void {
    this.failureNoticeState = null;
  }

  /**
   * 선택된 항목에 삭제(Delete)·이름변경(F2)·새 파일/폴더 만들기를 커맨드로 연다 — 키보드
   * 단축키와 우클릭 메뉴(`DirectoryTreeView`의 `CommandContextMenu`,
   * `menuId: 'filesystem.explorer.context'`) **둘 다 이 커맨드들 하나로 합류한다**(2026-09-04,
   * Menu 축 실배선). `execute`가 받는 `context`가 그 갈림길이다 — 우클릭이면 클릭한 행
   * (`ContextMenuTarget`)이 오고, 키보드/팔레트로 실행하면 `undefined`가 와서
   * (`ICommandService.dispatchKeydown`이 context 없이 부른다) 그때는 현재
   * 선택으로 대신한다.
   *
   * **알려진 단순화**: 우클릭 메뉴는 이름변경을 선택 개수와 무관하게 보여준다 — 이 앱의 Context
   * 축이 아직 호출별 데이터를 표현하지 못해서다. 안전장치는 `execute` 안에 있다: 정확히 하나가
   * 아니면 조용히 아무 일도 하지 않는다.
   */
  #registerFilesystemCommands(commandCenterRegistry: ICommandService): void {
    const toContextMenuTarget = (row: FileTreeRow): ContextMenuTarget => ({
      id: row.id,
      name: row.name,
      type: row.type,
    });

    const isContextMenuTarget = (value: unknown): value is ContextMenuTarget =>
      typeof value === "object" && value !== null && "id" in value && "name" in value && "type" in value;

    /** 우클릭이면 클릭한 행이 이미 `context`로 온다 — 키보드/팔레트 실행이면 현재 선택의 첫 항목으로 대신한다. */
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
        // 여러 개를 동시에 같은 이름으로 바꿀 방법이 없다 — 정확히 하나일 때만 연다(키보드 경로).
        // 메뉴 경로는 위 doc의 "알려진 단순화" 참고.
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
    // 새 파일/폴더는 기본 키바인딩을 안 둔다 — VSCode도 안 둔다(우클릭·팔레트로 충분히 닿는다).

    commandCenterRegistry.actions.add({
      id: "filesystem.newFolder",
      label: "탐색기: 새 폴더 만들기",
      execute: (context) => {
        this.setContextTarget(targetOf(context));
        this.requestNewFolder();
      },
    });

    /**
     * 경로 복사만 우선 연다 — 잘라내기/복사/붙여넣기(실제 파일 이동·복제)는
     * `IWorkspaceFiles`에 `move`(이동/이름변경)는 있지만 `copy`(복제)가 아직 없어서, 붙여넣기
     * 대상·클립보드 상태까지 포함한 온전한 구현은 이번 범위 밖이다(Port 확장이 먼저 필요).
     */
    commandCenterRegistry.actions.add({
      id: "filesystem.copyPath",
      label: "탐색기: 경로 복사",
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.#copyToClipboard(target.id);
      },
    });

    /**
     * 우클릭 메뉴(`menuId: 'filesystem.explorer.context'`) — `DirectoryTreeView`가
     * `CommandContextMenu`로 그린다. 순서는 만들기 → 변경 → 복사 → 파괴적 동작(삭제가 맨 아래).
     */
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

  /** `parentId 안에 새로 만든다`는 우클릭한 대상이 폴더면 그 안, 파일이면 그 부모, 빈 곳이면 루트다. */
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
        // 읽는 중이면 **그 폴더 행 자체가** 돈다 — 자식 행으로 흉내내면 진짜 파일과 구분되지 않는다.
        // **펼친 것만 돈다**: 프리페치까지 돌면 루트를 연 직후 폴더 24개가 한꺼번에 돌아 버벅여 보인다.
        loading: expanded.has(id) && directories[id]?.status === "loading",
        children: this.#folderChildren(directories, expanded, id),
      };
    });
  }

  /**
   * 아직 안 읽었거나 비어 있는 폴더는 그냥 자식 없이 둔다.
   *
   * 예전엔 여기서 자리 표시 행("…"/"비어 있다")을 만들어 넣었다 — 그때의 `FileTree`가 자식이
   * 없으면 펼침 화살표를 안 그렸기 때문이다. 지금 `FileTree`는 `type==='folder'`면 자식 유무와
   * 무관하게 항상 화살표를 그린다(2026-09, C1) — 펼쳤는데 비어 있으면 행 자체가 없는 게 맞다
   * (VSCode와 동일). **읽는 중 표시도 여기서 다루지 않는다** — 그건 부모 행의 `loading`이다.
   */
  #folderChildren(directories: DirectoryMap, expanded: ReadonlySet<string>, id: string): readonly FileTreeRow[] {
    const node = directories[id];
    if (node === undefined) return [];
    if (node.status === "error") {
      return [{ id: `${id}/…`, name: node.failure ?? "읽지 못했다", type: "file", disabled: true }];
    }
    return this.#childrenOf(directories, expanded, id);
  }

  /**
   * `editing`이 `newFile`/`newFolder`면 그 부모의 자식 목록 끝에 이름이 빈 유령 행을 끼워 넣는다.
   *
   * 유령 행의 `type`은 항상 `'file'`로 둔다 — `'folder'`로 두면, 부모가 마침 다른 실자식이
   * 없던 경우(자주 있다 — 막 만든 폴더·아직 안 읽은 폴더) 유령 행이 그 부모의 유일한 자식이 되어
   * `compactFolderChains`가 "폴더 하나만 자식인 체인"으로 오인해 부모와 유령을 한 행으로
   * 합쳐버린다 — 그러면 편집 대상 id도 초기값도 깨진다. 새 폴더를 만드는 동안 잠깐 파일 아이콘이
   * 보이는 것은 이 구조적 위험을 피하기 위한 의도적인 절충이다.
   */
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

  /** 구독과 감시를 끊는다. 컨테이너가 이 VM을 정리할 때 불린다. */
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

  /** 아직 아무 요청도 안 나갔으면 `idle` — 그 상태의 화면은 `loading`과 같지만, 둘을 합치면
   *  "다 읽었는데 비어 있음"까지 같이 뭉개진다. */
  #computeStatus() {
    return this.#model.directories[""]?.status ?? "idle";
  }

  #computeFailure(): string | null {
    return this.#model.directories[""]?.failure ?? null;
  }

  /** `contextTarget`이 지금 선택 안에 있으면 선택 전체, 아니면 그 행 하나다. */
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
