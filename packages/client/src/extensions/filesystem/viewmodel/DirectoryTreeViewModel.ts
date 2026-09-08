import type { Disposable } from '#core/di';
import { ViewModelBase } from '#core/view-model';
import { atom } from 'nanostores';
import type { DirectoryMap, IDirectoryTreeModel } from '../model/IDirectoryTreeModel';
import type { ICommandCenterRegistry } from '#core/commands';
import type { ContextMenuTarget, IDirectoryTreeViewModel, EditingEntry, FileTreeRow } from './IDirectoryTreeViewModel';
import { GHOST_ID } from './share';

/** `IDirectoryTreeViewModel`을 구현한다 — Model의 평평한 상태를 `computed`로 중첩 트리·컨텍스트 메뉴 대상으로 접는다. */
export class DirectoryTreeViewModel extends ViewModelBase implements IDirectoryTreeViewModel {
  readonly #model: IDirectoryTreeModel;
  readonly #subscription: Disposable;
  readonly #rows;
  readonly #expandedIds;
  readonly #selectedIds;
  readonly #status;
  readonly #failure;

  readonly #contextTarget = this.observe(atom<ContextMenuTarget | null>(null));
  readonly #contextTargets;
  readonly #editingEntry = this.observe(atom<EditingEntry | null>(null));
  readonly #deleteTargets = this.observe(atom<readonly ContextMenuTarget[]>([]));
  readonly #failureNotice = this.observe(atom<string | null>(null));

  readonly #copyToClipboard: (text: string) => void;
  readonly #isTypingSurface: () => boolean;

  constructor({
    directoryTreeModel,
    commandCenterRegistry,
    copyToClipboard,
    isTypingSurface,
  }: {
    directoryTreeModel: IDirectoryTreeModel;
    commandCenterRegistry: ICommandCenterRegistry;
    /** `no-restricted-globals`가 Model/ViewModel의 `navigator` 직접 참조를 막는다 — 조립부
     *  (`app/`, 대상 아님)가 이 얇은 함수를 주입한다. */
    copyToClipboard: (text: string) => void;
    /** 위와 같은 이유로 `document.activeElement` 접근도 조립부가 대신 판정해 함수로 준다. */
    isTypingSurface: () => boolean;
  }) {
    super();
    this.#copyToClipboard = copyToClipboard;
    this.#isTypingSurface = isTypingSurface;
    this.#model = directoryTreeModel;
    // Model은 값과 이벤트만 준다 — 파생된 화면 상태(atom)는 전부 여기서 소유한다.
    this.#rows = this.observe(atom(this.#computeRows()));
    this.#expandedIds = this.observe(atom(directoryTreeModel.expanded));
    this.#selectedIds = this.observe(atom(directoryTreeModel.selected));
    this.#status = this.observe(atom(this.#computeStatus()));
    this.#failure = this.observe(atom(this.#computeFailure()));
    this.#contextTargets = this.observe(atom(this.#computeContextTargets()));

    // Model이 바뀔 때, 그리고 이 VM 자신의 상태가 바뀔 때 파생값을 다시 만든다.
    this.#subscription = directoryTreeModel.onDidChange(() => this.#recompute());
    this.#contextTarget.listen(() => this.#recompute());
    this.#editingEntry.listen(() => this.#recompute());

    this.#registerFilesystemCommands(commandCenterRegistry);
  }

  /** `#rows`를 값으로 노출한다. */
  get rows(): readonly FileTreeRow[] {
    return this.#rows.get();
  }

  /** `#expandedIds`를 값으로 노출한다. */
  get expandedIds(): readonly string[] {
    return this.#expandedIds.get();
  }

  /** `#selectedIds`를 값으로 노출한다. */
  get selectedIds(): readonly string[] {
    return this.#selectedIds.get();
  }

  /** `#status`를 값으로 노출한다. */
  get status() {
    return this.#status.get();
  }

  /** `#failure`를 값으로 노출한다. */
  get failure(): string | null {
    return this.#failure.get();
  }

  /** `#model.load`에 위임한다. */
  start(): void {
    void this.#model.load();
  }

  /** `useViewModel`이 View 마운트에 자동으로 건다(`view-only-uses-view-model`) — View는 이 훅을
   *  직접 걸 수 없다. */
  onMount(): void {
    this.start();
    this.startWatching();
  }

  /** `stopWatching`에 위임한다. */
  onDispose(): void {
    this.stopWatching();
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
    return search(this.#rows.get());
  }

  /** 화면 어휘(`'folder'`/`'file'`)를 Model 어휘(`'dir'`/`'file'`)로 바꿔 `#model.createEntry`에 위임한다. */
  createEntry(parentId: string, name: string, type: 'folder' | 'file'): Promise<void> {
    return this.#model.createEntry(parentId, name, type === 'folder' ? 'dir' : 'file');
  }

  /** `#model.renameEntry`에 위임한다. */
  renameEntry(id: string, newName: string): Promise<void> {
    return this.#model.renameEntry(id, newName);
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
      this.#reportFailure('옮기지 못했다')(error);
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
    return this.#contextTarget.get();
  }

  /** `#contextTargets`를 값으로 노출한다. */
  get contextTargets(): readonly ContextMenuTarget[] {
    return this.#contextTargets.get();
  }

  /** `#contextTarget`에 그대로 반영한다. */
  setContextTarget(target: ContextMenuTarget | null): void {
    this.#contextTarget.set(target);
  }

  /** `#editingEntry`에서 `FileTree`가 바로 쓸 수 있는 id 하나로 접는다. */
  get editingId(): string | undefined {
    const editing = this.#editingEntry.get();
    if (editing === null) return undefined;
    return editing.kind === 'rename' ? editing.id : GHOST_ID;
  }

  /** `#editingEntry`를 `newFile`로 채운다 — 부모가 아직 안 펼쳐졌으면 먼저 펼친다(유령 행이
   *  보이려면 그 부모가 펼쳐져 있어야 한다). */
  requestNewFile(): void {
    this.#startCreating('newFile');
  }

  /** `#editingEntry`를 `newFolder`로 채운다. */
  requestNewFolder(): void {
    this.#startCreating('newFolder');
  }

  #startCreating(kind: 'newFile' | 'newFolder'): void {
    const parentId = this.#parentIdFor(this.#contextTarget.get());
    if (parentId !== '') void this.#model.setExpanded(parentId, true);
    this.#editingEntry.set({ kind, parentId });
  }

  /** `contextTarget`의 현재 이름을 초기값으로 `#editingEntry`를 채운다. */
  requestRename(): void {
    const target = this.#contextTarget.get();
    if (target === null) return;
    this.#editingEntry.set({ kind: 'rename', id: target.id, initialValue: target.name });
  }

  /** `#editingEntry.kind`에 따라 `createEntry`/`renameEntry`를 부르고 `#editingEntry`를 비운다. */
  onEditCommit(value: string): void {
    const editing = this.#editingEntry.get();
    this.#editingEntry.set(null);
    if (editing === null) return;

    const name = value.trim();
    if (name === '') return;

    if (editing.kind === 'rename') {
      if (name !== editing.initialValue) this.renameEntry(editing.id, name).catch(this.#reportFailure('이름을 바꾸지 못했다'));
      return;
    }
    this.createEntry(editing.parentId, name, editing.kind === 'newFile' ? 'file' : 'folder').catch(this.#reportFailure('만들지 못했다'));
  }

  /** `#editingEntry`를 비운다. */
  onEditCancel(): void {
    this.#editingEntry.set(null);
  }

  /** `#deleteTargets`를 값으로 노출한다. */
  get deleteTargets(): readonly ContextMenuTarget[] {
    return this.#deleteTargets.get();
  }

  /** `#contextTargets`를 `#deleteTargets`에 복사한다. */
  requestDelete(): void {
    this.#deleteTargets.set(this.#contextTargets.get());
  }

  /** `#deleteTargets`를 비우고 `removeEntries`를 부른다. */
  confirmDelete(): void {
    const targets = this.#deleteTargets.get();
    this.#deleteTargets.set([]);
    if (targets.length === 0) return;
    this.removeEntries(targets.map((target) => target.id)).catch(this.#reportFailure('지우지 못했다'));
  }

  /** `#deleteTargets`를 비운다. */
  cancelDelete(): void {
    this.#deleteTargets.set([]);
  }

  /** `#failureNotice`를 값으로 노출한다. */
  get failureNotice(): string | null {
    return this.#failureNotice.get();
  }

  /** `#failureNotice`를 비운다. */
  dismissFailureNotice(): void {
    this.#failureNotice.set(null);
  }

  /**
   * 선택된 항목에 삭제(Delete)·이름변경(F2)·새 파일/폴더 만들기를 커맨드로 연다 — 키보드
   * 단축키와 우클릭 메뉴(`DirectoryTreeView`의 `CommandContextMenu`,
   * `menuId: 'filesystem.explorer.context'`) **둘 다 이 커맨드들 하나로 합류한다**(2026-09-04,
   * Menu 축 실배선). `execute`가 받는 `context`가 그 갈림길이다 — 우클릭이면 클릭한 행
   * (`ContextMenuTarget`)이 오고, 키보드/팔레트로 실행하면 `undefined`가 와서
   * (`ICommandCenterRegistry.dispatchKeydown`이 `execute(undefined)`로 부른다) 그때는 현재
   * 선택으로 대신한다.
   *
   * 2026-09-06 — 옛 `app/filesystemCommands.ts`에서 여기로 옮겼다. "이 화면이 다루는 커맨드는
   * 이 화면의 ViewModel이 안다"로 방향을 바꿔, `commandCenterRegistry`를 생성자 DI로 받아 자기
   * 생성 시점에 `this`로 직접 등록한다(`ShellViewModel.#registerTabCommands`와 같은 패턴).
   *
   * `setContextTarget`으로 알리고 `requestDelete`/`requestRename`/`requestNewFile`/
   * `requestNewFolder`를 그대로 부르면, `DirectoryTreeView`가 이미 그리고 있는 같은 `Dialog`
   * (삭제 확인·이름 입력)가 뜬다 — 네이티브 `window.confirm`/`prompt` 대신이라는 원칙이 진입점과
   * 무관하게 하나로 지켜진다.
   *
   * **알려진 단순화**: 우클릭 메뉴는 지금 이름변경 항목을 선택 개수와 무관하게 항상 보여준다 —
   * VSCode라면 `when` 조건에 "선택이 정확히 하나"를 파생 컨텍스트로 걸어 메뉴 자체를 숨기지만,
   * 이 앱의 Context 축은 아직 전역 불리언 플래그만 다루고 "지금 우클릭한 대상 집합" 같은
   * 호출별 데이터는 표현하지 못한다. 대신 안전장치는 `execute` 안에 있다 — 정확히 하나가 아니면
   * 조용히 아무 일도 하지 않는다(VSCode도 여러 개를 동시에 같은 이름으로 바꿀 방법은 없다).
   */
  #registerFilesystemCommands(commandCenterRegistry: ICommandCenterRegistry): void {
    const toContextMenuTarget = (row: FileTreeRow): ContextMenuTarget => ({ id: row.id, name: row.name, type: row.type });

    const isContextMenuTarget = (value: unknown): value is ContextMenuTarget =>
      typeof value === 'object' && value !== null && 'id' in value && 'name' in value && 'type' in value;

    /** 우클릭이면 클릭한 행이 이미 `context`로 온다 — 키보드/팔레트 실행이면 현재 선택의 첫 항목으로 대신한다. */
    const targetOf = (context: unknown): ContextMenuTarget | null => {
      if (isContextMenuTarget(context)) return context;
      const ids = this.selectedIds;
      if (ids.length === 0) return null;
      const row = this.findRow(ids[0]!);
      return row === undefined ? null : toContextMenuTarget(row);
    };

    commandCenterRegistry.registerCommand({
      id: 'filesystem.delete',
      label: '탐색기: 선택한 항목 삭제',
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.setContextTarget(target);
        this.requestDelete();
      },
    });
    commandCenterRegistry.registerKeybinding({
      id: 'filesystem.delete.keybinding',
      keybinding: 'delete',
      actionId: 'filesystem.delete',
      when: () => !this.#isTypingSurface(),
    });

    commandCenterRegistry.registerCommand({
      id: 'filesystem.rename',
      label: '탐색기: 선택한 항목 이름 바꾸기',
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
    commandCenterRegistry.registerKeybinding({
      id: 'filesystem.rename.keybinding',
      keybinding: 'f2',
      actionId: 'filesystem.rename',
      when: () => !this.#isTypingSurface(),
    });

    commandCenterRegistry.registerCommand({
      id: 'filesystem.newFile',
      label: '탐색기: 새 파일 만들기',
      execute: (context) => {
        this.setContextTarget(targetOf(context));
        this.requestNewFile();
      },
    });
    // 새 파일/폴더는 기본 키바인딩을 안 둔다 — VSCode도 안 둔다(우클릭·팔레트로 충분히 닿는다).

    commandCenterRegistry.registerCommand({
      id: 'filesystem.newFolder',
      label: '탐색기: 새 폴더 만들기',
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
    commandCenterRegistry.registerCommand({
      id: 'filesystem.copyPath',
      label: '탐색기: 경로 복사',
      execute: (context) => {
        const target = targetOf(context);
        if (target === null) return;
        this.#copyToClipboard(target.id);
      },
    });

    /**
     * 우클릭 메뉴(`menuId: 'filesystem.explorer.context'`) — `DirectoryTreeView`가
     * `CommandContextMenu`로 그린다. `group`은 VSCode 관례를 따른다 — `1_create`가 만들기,
     * `2_modify`가 변경, `9_danger`가 파괴적 동작(사전순으로 갈린다, `matchMenuItems` 참고).
     */
    commandCenterRegistry.registerMenuItem({ id: 'filesystem.explorer.context.newFile', menuId: 'filesystem.explorer.context', commandId: 'filesystem.newFile', group: '1_create', order: 0 });
    commandCenterRegistry.registerMenuItem({ id: 'filesystem.explorer.context.newFolder', menuId: 'filesystem.explorer.context', commandId: 'filesystem.newFolder', group: '1_create', order: 1 });
    commandCenterRegistry.registerMenuItem({ id: 'filesystem.explorer.context.rename', menuId: 'filesystem.explorer.context', commandId: 'filesystem.rename', group: '2_modify', order: 0 });
    commandCenterRegistry.registerMenuItem({ id: 'filesystem.explorer.context.delete', menuId: 'filesystem.explorer.context', commandId: 'filesystem.delete', group: '9_danger', order: 0 });
    commandCenterRegistry.registerMenuItem({ id: 'filesystem.explorer.context.copyPath', menuId: 'filesystem.explorer.context', commandId: 'filesystem.copyPath', group: '3_copy', order: 0 });
  }

  /** `parentId 안에 새로 만든다`는 우클릭한 대상이 폴더면 그 안, 파일이면 그 부모, 빈 곳이면 루트다. */
  #parentIdFor(target: ContextMenuTarget | null): string {
    if (target === null) return '';
    if (target.type === 'folder') return target.id;
    const slash = target.id.lastIndexOf('/');
    return slash === -1 ? '' : target.id.slice(0, slash);
  }

  #reportFailure(verb: string): (error: unknown) => void {
    return (error) => {
      this.#failureNotice.set(`${verb} — ${error instanceof Error ? error.message : String(error)}`);
    };
  }

  #toContextMenuTarget(row: FileTreeRow): ContextMenuTarget {
    return { id: row.id, name: row.name, type: row.type };
  }

  #childrenOf(directories: DirectoryMap, expanded: ReadonlySet<string>, path: string): readonly FileTreeRow[] {
    const node = directories[path];
    if (node === undefined) return [];

    return node.entries.map((entry) => {
      const id = path === '' ? entry.name : `${path}/${entry.name}`;
      if (entry.type === 'file') return { id, name: entry.name, type: 'file' as const };
      return {
        id,
        name: entry.name,
        type: 'folder' as const,
        // 읽는 중이면 **그 폴더 행 자체가** 돈다. 예전에는 "읽는 중…" 이라는 자식 행을 만들어
        // 넣었는데, 그건 파일 행 흉내라 정말 그런 이름의 파일과 구분되지 않았다.
        //
        // **펼친 것만 돈다.** 배경에서 미리 읽는 폴더까지 돌면, 루트를 연 직후 폴더 24개가 한꺼번에
        // 돌아 앱이 버벅이는 것처럼 보인다. 프리페치는 티가 나지 않아야 값어치가 있다.
        loading: expanded.has(id) && directories[id]?.status === 'loading',
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
    if (node.status === 'error') {
      return [{ id: `${id}/…`, name: node.failure ?? '읽지 못했다', type: 'file', disabled: true }];
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
    if (editing === null || editing.kind === 'rename') return rows;
    const ghost: FileTreeRow = { id: GHOST_ID, name: '', type: 'file' };
    if (editing.parentId === '') return [...rows, ghost];
    return rows.map((row) => {
      if (row.id === editing.parentId) return { ...row, children: [...(row.children ?? []), ghost] };
      if (row.children === undefined) return row;
      return { ...row, children: this.#withEditingGhost(row.children, editing) };
    });
  }

  /** 구독을 끊는다. 컨테이너가 이 VM을 정리할 때 불린다. */
  dispose(): void {
    this.#subscription.dispose();
  }

  #recompute(): void {
    this.#rows.set(this.#computeRows());
    this.#expandedIds.set(this.#model.expanded);
    this.#selectedIds.set(this.#model.selected);
    this.#status.set(this.#computeStatus());
    this.#failure.set(this.#computeFailure());
    this.#contextTargets.set(this.#computeContextTargets());
  }

  #computeRows(): readonly FileTreeRow[] {
    return this.#withEditingGhost(
      this.#childrenOf(this.#model.directories, new Set(this.#model.expanded), ''),
      this.#editingEntry.get(),
    );
  }

  /** 아직 아무 요청도 안 나갔으면 `idle` — 그 상태의 화면은 `loading`과 같지만, 둘을 합치면
   *  "다 읽었는데 비어 있음"까지 같이 뭉개진다. */
  #computeStatus() {
    return this.#model.directories['']?.status ?? 'idle';
  }

  #computeFailure(): string | null {
    return this.#model.directories['']?.failure ?? null;
  }

  /** `contextTarget`이 지금 선택 안에 있으면 선택 전체, 아니면 그 행 하나다. */
  #computeContextTargets(): readonly ContextMenuTarget[] {
    const target = this.#contextTarget.get();
    if (target === null) return [];
    const selectedIds = this.#model.selected;
    if (!selectedIds.includes(target.id)) return [target];
    return selectedIds.flatMap((id) => {
      const row = id === target.id ? target : this.findRow(id);
      return row === undefined ? [] : [this.#toContextMenuTarget(row)];
    });
  }

}
