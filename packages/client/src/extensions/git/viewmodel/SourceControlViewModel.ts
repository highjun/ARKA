import type { Disposable } from "#core/di";
import { ViewModelBase } from "#core/viewmodel";
import { atom } from "nanostores";
import type { GitFileStatus } from "#contracts";
import type { IGitModel } from "../model/IGitModel";
import type { ChangeRow, DiffState, ISourceControlViewModel } from "./ISourceControlViewModel";

const BADGE = { added: "A", modified: "M", deleted: "D", renamed: "R", untracked: "U" } as const;

/** diff 탭 id `staged:path` / `wt:path`를 푼다. 모양이 아니면 `null`. */
export const parseDiffTabId = (tabId: string): { path: string; staged: boolean } | null => {
  const colon = tabId.indexOf(":");
  if (colon === -1) return null;
  const kind = tabId.slice(0, colon);
  if (kind !== "staged" && kind !== "wt") return null;
  return { path: tabId.slice(colon + 1), staged: kind === "staged" };
};

/** `ISourceControlViewModel`의 유일한 구현체. */
export class SourceControlViewModel extends ViewModelBase implements ISourceControlViewModel {
  readonly #model: IGitModel;
  readonly #repository;
  readonly #branch;
  readonly #loading;
  readonly #staged;
  readonly #unstaged;
  readonly #message = this.observe(atom(""));
  readonly #busy = this.observe(atom(false));
  readonly #failure;
  readonly #lastCommit = this.observe(atom<string | null>(null));
  readonly #diffs;
  readonly #requested = new Set<string>();
  /** 마지막으로 본 `files` 참조 — 바뀌었을 때만 diff 요청 기록을 지운다. */
  #lastFiles: readonly GitFileStatus[];
  #subscription: Disposable | null = null;

  /** 구독은 `onMount`에서 시작한다 — 만드는 것만으로는 git을 부르지 않는다. */
  constructor({ gitModel }: { gitModel: IGitModel }) {
    super();
    this.#model = gitModel;
    this.#lastFiles = gitModel.files;
    this.#repository = this.observe(atom(gitModel.repository));
    this.#branch = this.observe(atom(gitModel.branch));
    this.#loading = this.observe(atom(gitModel.status === "loading"));
    this.#staged = this.observe(atom(this.#rows(true)));
    this.#unstaged = this.observe(atom(this.#rows(false)));
    this.#failure = this.observe(atom(gitModel.failure));
    this.#diffs = this.observe(atom(gitModel.diffs));
  }

  /** 구독을 걸고 곧바로 한 번 읽는다. 패널이 처음 보일 때 컨테이너가 부른다. */
  onMount(): void {
    this.#subscription = this.#model.onDidChange(() => this.#recompute());
    void this.#model.refresh();
  }

  /** 구독만 끊는다 — 진행 중인 요청을 취소하지는 않는다. */
  onDispose(): void {
    this.#subscription?.dispose();
    this.#subscription = null;
  }

  /** 아직 안 읽었으면 `false`다. 화면은 이 값으로 빈 상태를 그린다. */
  get repository(): boolean {
    return this.#repository.get();
  }

  /** 분리 HEAD거나 아직 안 읽었으면 `null`이다. */
  get branch(): string | null {
    return this.#branch.get();
  }

  /** 조작 중에도 켜진다 — 뒤이어 상태를 다시 읽기 때문이다. */
  get loading(): boolean {
    return this.#loading.get();
  }

  /** 스테이지된 것만. Model의 한 목록을 여기서 가른다. */
  get staged(): readonly ChangeRow[] {
    return this.#staged.get();
  }

  /** 스테이지 안 된 것만. Model의 한 목록을 여기서 가른다. */
  get unstaged(): readonly ChangeRow[] {
    return this.#unstaged.get();
  }

  /** 입력창의 현재 값 — 커밋에 성공하면 비워진다. */
  get message(): string {
    return this.#message.get();
  }

  /** 메시지가 있고, 스테이지가 비지 않았고, 다른 조작이 안 도는 중일 때만 참이다. */
  get canCommit(): boolean {
    return this.#message.get().trim() !== "" && this.#staged.get().length > 0 && !this.#busy.get();
  }

  /** 마지막 실패의 메시지. 성공하면 지워진다. */
  get failure(): string | null {
    return this.#failure.get();
  }

  /** 짧은 해시 7자다. 새로고침해도 남는다. */
  get lastCommit(): string | null {
    return this.#lastCommit.get();
  }

  /** 결과를 기다리지 않는다 — 끝나면 구독을 통해 화면이 갱신된다. */
  refresh(): void {
    void this.#model.refresh();
  }

  /** 타이핑마다 불려도 된다 — 이 값은 Model로 가지 않는다. */
  setMessage(message: string): void {
    this.#message.set(message);
  }

  /** 한 경로만 올린다. 끝나면 상태를 다시 읽는다. */
  stage(path: string): void {
    void this.#run(() => this.#model.stage([path]));
  }

  /** 한 경로만 내린다. 끝나면 상태를 다시 읽는다. */
  unstage(path: string): void {
    void this.#run(() => this.#model.unstage([path]));
  }

  /** 지금 목록에 보이는 것만 올린다 — 비어 있으면 아무 일도 안 한다. */
  stageAll(): void {
    const paths = this.#unstaged.get().map((row) => row.path);
    if (paths.length > 0) void this.#run(() => this.#model.stage(paths));
  }

  /** 지금 목록에 보이는 것만 내린다 — 비어 있으면 아무 일도 안 한다. */
  unstageAll(): void {
    const paths = this.#staged.get().map((row) => row.path);
    if (paths.length > 0) void this.#run(() => this.#model.unstage(paths));
  }

  /** `canCommit`이 아니면 아무 일도 안 한다. 성공하면 메시지를 비운다. */
  commit(): void {
    if (!this.canCommit) return;
    const message = this.#message.get();
    void this.#run(async () => {
      const hash = await this.#model.commit(message);
      if (hash !== null) {
        this.#lastCommit.set(hash.slice(0, 7));
        this.#message.set("");
      }
    });
  }

  /** 같은 탭을 두 번 열어도 한 번만 읽는다 — 기록은 파일 목록이 바뀔 때 지워진다. */
  openDiff(tabId: string): void {
    const parsed = parseDiffTabId(tabId);
    if (parsed === null || this.#requested.has(tabId)) return;
    this.#requested.add(tabId);
    void this.#model.loadDiff(parsed.path, parsed.staged);
  }

  /** 아직 없는 탭이면 `loading` 상태를 돌려준다 — 화면이 빈 값을 다루지 않아도 된다. */
  diffOf(tabId: string): DiffState {
    const entry = this.#diffs.get()[tabId];
    if (entry === undefined) return { loading: true, text: "", failure: null };
    return { loading: entry.status === "loading", text: entry.text, failure: entry.failure };
  }

  async #run(work: () => Promise<void>): Promise<void> {
    this.#busy.set(true);
    try {
      await work();
    } finally {
      this.#busy.set(false);
    }
  }

  #rows(staged: boolean): readonly ChangeRow[] {
    const rows: ChangeRow[] = [];
    for (const file of this.#model.files) {
      const change = staged ? file.staged : file.unstaged;
      if (change === null) continue;
      rows.push({ path: file.path, badge: BADGE[change], staged });
    }
    return rows;
  }

  #recompute(): void {
    this.#repository.set(this.#model.repository);
    this.#branch.set(this.#model.branch);
    this.#loading.set(this.#model.status === "loading");
    this.#staged.set(this.#rows(true));
    this.#unstaged.set(this.#rows(false));
    this.#failure.set(this.#model.failure);
    this.#diffs.set(this.#model.diffs);
    // 상태가 새로 읽혔을 때만(files 참조가 바뀜) diff 요청 기록을 지운다 — 다음 openDiff가 다시 읽게.
    // diff 도착 같은 다른 변경에도 지우면 렌더 → openDiff → loadDiff → 변경 → 렌더의 무한 루프가 된다.
    if (this.#model.files !== this.#lastFiles) {
      this.#lastFiles = this.#model.files;
      this.#requested.clear();
    }
  }
}

export type { GitFileStatus };
