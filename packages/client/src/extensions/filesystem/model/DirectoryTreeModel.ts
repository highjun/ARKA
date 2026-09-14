import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { FileEntryType, IWorkspaceFiles } from "../model/IWorkspaceFiles";
import type { IWorkspaceWatch, WorkspaceWatchUnsubscribe } from "../model/IWorkspaceWatch";
import type { DirectoryMap, IDirectoryTreeModel } from "./IDirectoryTreeModel";

/** `IDirectoryTreeModel`을 구현한다 — 프리페치와 debounce된 감시 재구독을 내부에 둔다. */
export class DirectoryTreeModel implements IDirectoryTreeModel {
  /**
   * 미리 읽어 둘 하위 디렉터리 수 상한.
   *
   * 안 두면 `node_modules/.pnpm` 하나 펼칠 때 수백 요청이 나간다. 폰 한 화면에 들어오는 행 수
   * 언저리로 잡았다 — 스크롤해야 보이는 것까지 당길 이유가 없다.
   */
  static readonly #PREFETCH_LIMIT = 24;

  /** 동시에 나가는 프리페치 수. 터널 하나를 배경 작업이 독점하지 않게 한다. */
  static readonly #PREFETCH_CONCURRENCY = 3;

  /** 펼침이 연속으로 바뀔 때(폴더를 빠르게 여러 개 펼치는 것) 재구독을 그만큼 늦춘다 — 매번 SSE
   *  연결을 끊고 새로 여는 낭비를 막는다. */
  static readonly #WATCH_DEBOUNCE_MS = 300;

  readonly #files: IWorkspaceFiles;
  readonly #watch: IWorkspaceWatch;

  #directories: DirectoryMap = {};
  #expanded: readonly string[] = [];
  #selected: readonly string[] = [];

  /**
   * 진행 중인 요청. 같은 경로를 두 번 부르면 **나가 있는 것에 붙는다.**
   *
   * 프리페치가 생기고 나서 필수가 됐다 — 배경에서 읽는 중인 폴더를 사용자가 누르면, 없으면
   * 요청이 한 번 더 나간다.
   */
  readonly #inFlight = new Map<string, Promise<void>>();

  /**
   * 지금 유효한 프리페치 배치. 새 배치가 시작되면 번호가 올라가고 이전 배치는 스스로 멈춘다 —
   * 사용자가 딴 데로 갔으면 그 작업은 죽은 것이다.
   */
  #prefetchGeneration = 0;

  /** 감시가 켜져 있는가. 꺼져 있으면 `#rewatch` 는 아무 일도 하지 않는다. */
  #watching = false;
  /** 지금 구독 중인 경로 — 재구독 여부를 판단하는 데 쓴다(바뀐 게 없으면 다시 붙지 않는다). */
  #watchedPaths: readonly string[] = [];
  #unwatch: WorkspaceWatchUnsubscribe | undefined;
  #watchDebounce: ReturnType<typeof setTimeout> | undefined;

  /** 만들기만 해서는 아무것도 읽지 않는다 — 루트를 펼쳐야 시작한다. */
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

  /** `#directories`를 그대로 노출한다. */
  get directories(): DirectoryMap {
    return this.#directories;
  }

  /** `#expanded`를 그대로 노출한다. */
  get expanded(): readonly string[] {
    return this.#expanded;
  }

  /** `#selected`를 그대로 노출한다. */
  get selected(): readonly string[] {
    return this.#selected;
  }

  /** 루트를 읽고, 그 자식을 미리 읽어 두고, 감시 구독을 갱신한다. */
  async load(): Promise<void> {
    await this.#read("");
    this.#prefetchChildren("");
    this.#rewatch();
  }

  /**
   * 접을 때는 읽지 않는다. 펼칠 때만, 그것도 **아직 읽지 않았을 때만** 읽는다 — 폴더를 여닫을
   * 때마다 요청이 나가면 트리를 훑는 것만으로 서버가 시달린다.
   */
  async setExpanded(path: string, expanded: boolean): Promise<void> {
    const open = this.#expanded;
    if (!expanded) {
      this.#setExpanded(open.filter((each) => each !== path));
      this.#rewatch();
      return;
    }

    if (!open.includes(path)) this.#setExpanded([...open, path]);
    await this.#read(path);
    // 방금 화면에 드러난 하위 폴더들을 미리 읽어 둔다 — 다음에 펼칠 것이 그 안에 있다.
    this.#prefetchChildren(path);
    this.#rewatch();
  }

  /** `#selected`에 그대로 반영한다. */
  setSelection(paths: readonly string[]): void {
    this.#setSelected(paths);
  }

  /** `#files.create`로 만들고 부모 디렉터리를 다시 읽는다. */
  async createEntry(parentPath: string, name: string, type: FileEntryType): Promise<void> {
    await this.#files.create(DirectoryTreeModel.#join(parentPath, name), type);
    await this.#refresh(parentPath);
  }

  /** `#files.move`로 이름을 바꾸고 부모 디렉터리를 다시 읽는다. */
  async renameEntry(path: string, newName: string): Promise<void> {
    const parent = DirectoryTreeModel.#parentOf(path);
    await this.#files.move(path, DirectoryTreeModel.#join(parent, newName));
    await this.#refresh(parent);
  }

  /** `#files.remove`로 지우고 부모를 다시 읽은 뒤, 선택에 남은 후손 경로를 걷어낸다. */
  async removeEntry(path: string): Promise<void> {
    await this.#files.remove(path);
    await this.#refresh(DirectoryTreeModel.#parentOf(path));
    // 지운 경로(폴더면 그 후손까지)가 선택에 유령으로 남으면, 다음 다중 삭제가 이미 없는 경로에
    // DELETE를 다시 쏜다 — 삭제 직후 여기서 걷어낸다.
    this.#setSelected(this.#selected.filter((selected) => !DirectoryTreeModel.#isPathOrDescendant(selected, path)));
  }

  /** `#files.move`로 옮기고 옛 부모와 새 부모를 다시 읽는다. */
  async moveToFolder(path: string, toParentPath: string): Promise<string> {
    const toPath = DirectoryTreeModel.#join(toParentPath, DirectoryTreeModel.#basename(path));
    await this.#files.move(path, toPath);
    const fromParent = DirectoryTreeModel.#parentOf(path);
    // 같은 부모 안으로 "옮긴" 경우(드롭 위치가 원래 있던 자리) 한 번만 읽으면 된다.
    await this.#refresh(fromParent);
    if (toParentPath !== fromParent) await this.#refresh(toParentPath);
    return toPath;
  }

  /** 감시 플래그를 켜고 `#rewatch`를 부른다. */
  startWatching(): void {
    this.#watching = true;
    this.#rewatch();
  }

  /** 감시 플래그를 끄고 debounce 타이머와 구독을 정리한다. */
  stopWatching(): void {
    this.#watching = false;
    if (this.#watchDebounce !== undefined) clearTimeout(this.#watchDebounce);
    this.#watchDebounce = undefined;
    this.#unwatch?.();
    this.#unwatch = undefined;
    this.#watchedPaths = [];
  }

  /**
   * 펼쳐진 디렉터리(+루트)가 바뀔 때마다 구독을 다시 건다 — 자주 바뀌는 사이에는 debounce 로
   * 뭉갠다. 집합이 실제로 안 바뀌었으면 재연결조차 하지 않는다(`#read` 가 이미 읽은 것을 다시
   * 읽지 않는 것과 같은 결이다 — SSE 연결을 여닫는 것도 비용이다).
   */
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

  /**
   * 이미 읽었으면 아무것도 하지 않고, 읽는 중이면 **나가 있는 요청에 붙는다.**
   *
   * 예전에는 `status !== 'loaded'` 만 보고 곧장 다시 읽어서, 읽는 중에 한 번 더 누르면 요청이
   * 두 번 나갔다. 실패한 것은 다시 시도해야 하므로 `error` 는 통과시킨다.
   */
  async #read(path: string): Promise<void> {
    const known = this.#directories[path];
    if (known?.status === "loaded") return;

    const nagging = this.#inFlight.get(path);
    if (nagging !== undefined) return nagging;

    const request = this.#fetch(path).finally(() => this.#inFlight.delete(path));
    this.#inFlight.set(path, request);
    return request;
  }

  /**
   * 생성·이동·삭제 뒤에 부모 디렉터리를 **무조건** 다시 읽는다.
   *
   * `#read` 는 이미 `loaded` 면 건너뛴다 — 방금 그 디렉터리를 바꿔 놓은 참이니 그 지름길을 타면
   * 안 된다. 아직 한 번도 펼치지 않은 디렉터리(`undefined`)를 미리 읽을 이유는 없다 — 나중에
   * 펼칠 때 `#read` 가 알아서 읽는다.
   */
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

  /**
   * 방금 화면에 드러난 하위 디렉터리들을 배경에서 미리 읽는다.
   *
   * **이 화면의 비용은 서버가 아니라 왕복이다.** 목록 자체는 수 ms 에 끝나는데 터널을 오가는 데
   * 0.5초쯤 든다. 네 단계를 내려가면 그 왕복을 네 번 기다린다 — 그런데 다음에 펼칠 폴더는 이미
   * 화면에 보이고 있으므로, 그때 미리 받아 두면 펼치는 순간은 기다림이 없다.
   *
   * **사용자가 펼칠 때만 부른다** — `#fetch` 안에서 부르면 미리 읽은 것이 또 미리 읽어서 트리
   * 아래로 끝없이 번진다. 한 걸음만 앞선다.
   *
   * 기다리지 않는다(`void`) — 화면을 막지 않는 배경 작업이다. 실패해도 조용히 넘어간다. 진짜로
   * 필요해지는 순간(사용자가 그 폴더를 펼칠 때) 다시 시도되고, 그때는 실패가 화면에 뜬다.
   */
  #prefetchChildren(path: string): void {
    const generation = (this.#prefetchGeneration += 1);
    const queue = (this.#directories[path]?.entries ?? [])
      .filter((entry) => entry.type === "dir")
      .slice(0, DirectoryTreeModel.#PREFETCH_LIMIT)
      .map((entry) => (path === "" ? entry.name : `${path}/${entry.name}`));

    const worker = async (): Promise<void> => {
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        // 사용자가 다른 폴더를 펼쳤으면 이 배치는 죽은 것이다.
        if (generation !== this.#prefetchGeneration) return;
        await this.#read(next);
      }
    };

    for (let slot = 0; slot < DirectoryTreeModel.#PREFETCH_CONCURRENCY; slot += 1) void worker();
  }

  #write(path: string, node: DirectoryMap[string]): void {
    this.#setDirectories({ ...this.#directories, [path]: node });
  }

  /** `a/b/c` → `a/b`. 한 단계뿐이면(`a`) 루트(`''`)다. */
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

  /** `candidate`가 `ancestor` 자신이거나 그 아래(후손)인지 — 경로 문자열 prefix로 본다. */
  static #isPathOrDescendant(candidate: string, ancestor: string): boolean {
    return candidate === ancestor || candidate.startsWith(`${ancestor}/`);
  }

  readonly #changed = new Emitter();

  /**
   * 상태를 바꾸고 한 번만 알린다.
   *
   * Model은 상태 라이브러리를 모른다 — 값은 getter로 주고 변화는 이 이벤트로만 알린다.
   * atom을 갖는 건 ViewModel의 일이다.
   */
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

  /** 상태가 바뀔 때마다 부른다. 돌려받은 `dispose()`로 끊는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
