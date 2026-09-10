import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { IWorkspaceFiles } from '../model/IWorkspaceFiles';
import type { IWorkspaceWatch, WorkspaceWatchUnsubscribe } from '../model/IWorkspaceWatch';
import type { IFileContentModel, OpenFile, OpenFileMap } from './IFileContentModel';

/** `IFileContentModel`을 구현한다 — 열린 파일 집합 변화에 debounce된 감시 재구독을 붙인다. */
export class FileContentModel implements IFileContentModel {
  /** 열린 파일 집합이 연속으로 바뀔 때(탭을 여러 개 빠르게 여는 것) 재구독을 그만큼 늦춘다. */
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

  /** `#open`을 그대로 노출한다. */
  get files(): OpenFileMap {
    return this.#open;
  }

  /**
   * 이미 읽은 파일은 다시 읽지 않는다 — 탭을 오갈 때마다 요청이 나가지 않게.
   *
   * **단 실패는 캐시하지 않는다.** 실패한 파일을 다시 여는 것은 사용자가 다시 해보려는 뜻인데,
   * 그때 아무 일도 일어나지 않으면 화면이 영영 에러로 굳는다. `directory-tree` 가 실패한 폴더를
   * 다시 펼칠 때 다시 읽는 것과 같은 규칙이다.
   */
  async open(path: string): Promise<void> {
    const known = this.#open[path];
    if (known !== undefined && known.status !== 'error') return;
    await this.reload(path);
    this.#rewatch();
  }

  /** `#files.read`로 무조건 다시 읽어 `#open`을 갱신한다. */
  async reload(path: string): Promise<void> {
    this.#write({
      path,
      status: 'loading',
      savedContent: '',
      content: '',
      truncated: false,
      binary: false,
      failure: null,
      saveStatus: 'idle',
      saveFailure: null,
    });
    try {
      const file = await this.#files.read(path);
      this.#write({
        path,
        status: 'loaded',
        savedContent: file.content,
        content: file.content,
        truncated: file.truncated,
        binary: file.encoding === 'binary',
        failure: null,
        saveStatus: 'idle',
        saveFailure: null,
      });
    } catch (error) {
      this.#write({
        path,
        status: 'error',
        savedContent: '',
        content: '',
        truncated: false,
        binary: false,
        failure: error instanceof Error ? error.message : String(error),
        saveStatus: 'idle',
        saveFailure: null,
      });
    }
  }

  /** `#open`에서 지우고 `#rewatch`로 구독을 갱신한다. */
  close(path: string): void {
    this.#setOpen(Object.fromEntries(Object.entries(this.#open).filter(([open]) => open !== path)));
    this.#rewatch();
  }

  /** `#editable`로 걸러 통과하면 `content`만 갱신한다. */
  edit(path: string, content: string): void {
    const file = this.#editable(path);
    if (file === undefined) return;
    this.#write({ ...file, content });
  }

  /**
   * 캡처해 둔 `content`(호출 시점의 버퍼)를 보낸다 — 저장이 끝나기 전에 사용자가 더 타이핑해도
   * 그 사이 값을 함부로 "저장됨"으로 표시하지 않기 위해서다. 성공하면 **그 값까지만**
   * `savedContent` 를 올린다 — 저장 중에 더 들어온 변경은 여전히 dirty 로 남아, 다음 저장을
   * 기다린다.
   */
  async save(path: string): Promise<void> {
    const file = this.#editable(path);
    if (file === undefined || file.saveStatus === 'saving' || file.content === file.savedContent) return;

    const sent = file.content;
    this.#write({ ...file, saveStatus: 'saving', saveFailure: null });
    try {
      await this.#files.write(path, sent);
      const latest = this.#open[path];
      // 저장 중에 탭이 닫혔다
      if (latest === undefined) return;
      this.#write({ ...latest, savedContent: sent, saveStatus: 'idle', saveFailure: null });
    } catch (error) {
      const latest = this.#open[path];
      if (latest === undefined) return;
      this.#write({
        ...latest,
        saveStatus: 'error',
        saveFailure: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** 접두사가 일치하는 키를 새 접두사로 다시 붙여 `#open`을 갱신한다. */
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
   * 열린 파일 집합이 바뀔 때마다 구독을 다시 건다. 집합이 실제로 안 바뀌었으면 재연결하지 않는다.
   */
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
          // dirty(미저장 편집이 있는) 파일은 자동 리로드에서 건너뛴다 — 사용자의 편집을 서버
          // 쪽 변경으로 조용히 덮어쓰지 않기 위해서다. 충돌 UI는 이번 스코프 밖이다.
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

  /** `edit`·`save` 가 공유하는 자격 검사 — 다 읽혔고, 잘리지 않았고, 텍스트인 파일만 통과한다. */
  #editable(path: string): OpenFile | undefined {
    const file = this.#open[path];
    if (file === undefined || file.status !== 'loaded' || file.truncated || file.binary) return undefined;
    return file;
  }

  #write(file: OpenFile): void {
    this.#setOpen({ ...this.#open, [file.path]: file });
  }

  readonly #changed = new Emitter();

  /**
   * 상태를 바꾸고 한 번만 알린다.
   *
   * Model은 상태 라이브러리를 모른다 — 값은 getter로 주고 변화는 이 이벤트로만 알린다.
   * atom을 갖는 건 ViewModel의 일이다.
   */
  #setOpen(next: OpenFileMap): void {
    if (this.#open === next) return;
    this.#open = next;
    this.#changed.fire();
  }


  /** 상태가 바뀔 때마다 부른다. 돌려받은 `dispose()`로 끊는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

}
