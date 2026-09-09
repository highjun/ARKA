import type { Disposable } from '#core/di';
import { ViewModelBase } from '#core/viewmodel';
import { atom } from 'nanostores';
import type { GitFileStatus } from '#contracts';
import type { IGitModel } from '../model/IGitModel';
import type { ChangeRow, DiffState, ISourceControlViewModel } from './ISourceControlViewModel';

const BADGE = { added: 'A', modified: 'M', deleted: 'D', renamed: 'R', untracked: 'U' } as const;

/** diff 탭 id `staged:path` / `wt:path`를 푼다. 모양이 아니면 `null`. */
export const parseDiffTabId = (tabId: string): { path: string; staged: boolean } | null => {
  const colon = tabId.indexOf(':');
  if (colon === -1) return null;
  const kind = tabId.slice(0, colon);
  if (kind !== 'staged' && kind !== 'wt') return null;
  return { path: tabId.slice(colon + 1), staged: kind === 'staged' };
};

/** `ISourceControlViewModel`의 유일한 구현체. */
export class SourceControlViewModel extends ViewModelBase implements ISourceControlViewModel {
  readonly #model: IGitModel;
  readonly #repository;
  readonly #branch;
  readonly #loading;
  readonly #staged;
  readonly #unstaged;
  readonly #message = this.observe(atom(''));
  readonly #busy = this.observe(atom(false));
  readonly #failure;
  readonly #lastCommit = this.observe(atom<string | null>(null));
  readonly #diffs;
  readonly #requested = new Set<string>();
  /** 마지막으로 본 `files` 참조 — 바뀌었을 때만 diff 요청 기록을 지운다. */
  #lastFiles: readonly GitFileStatus[];
  #subscription: Disposable | null = null;

  constructor({ gitModel }: { gitModel: IGitModel }) {
    super();
    this.#model = gitModel;
    this.#lastFiles = gitModel.files;
    this.#repository = this.observe(atom(gitModel.repository));
    this.#branch = this.observe(atom(gitModel.branch));
    this.#loading = this.observe(atom(gitModel.status === 'loading'));
    this.#staged = this.observe(atom(this.#rows(true)));
    this.#unstaged = this.observe(atom(this.#rows(false)));
    this.#failure = this.observe(atom(gitModel.failure));
    this.#diffs = this.observe(atom(gitModel.diffs));
  }

  onMount(): void {
    this.#subscription = this.#model.onDidChange(() => this.#recompute());
    void this.#model.refresh();
  }

  onDispose(): void {
    this.#subscription?.dispose();
    this.#subscription = null;
  }

  get repository(): boolean {
    return this.#repository.get();
  }

  get branch(): string | null {
    return this.#branch.get();
  }

  get loading(): boolean {
    return this.#loading.get();
  }

  get staged(): readonly ChangeRow[] {
    return this.#staged.get();
  }

  get unstaged(): readonly ChangeRow[] {
    return this.#unstaged.get();
  }

  get message(): string {
    return this.#message.get();
  }

  get canCommit(): boolean {
    return this.#message.get().trim() !== '' && this.#staged.get().length > 0 && !this.#busy.get();
  }

  get failure(): string | null {
    return this.#failure.get();
  }

  get lastCommit(): string | null {
    return this.#lastCommit.get();
  }

  refresh(): void {
    void this.#model.refresh();
  }

  setMessage(message: string): void {
    this.#message.set(message);
  }

  stage(path: string): void {
    void this.#run(() => this.#model.stage([path]));
  }

  unstage(path: string): void {
    void this.#run(() => this.#model.unstage([path]));
  }

  stageAll(): void {
    const paths = this.#unstaged.get().map((row) => row.path);
    if (paths.length > 0) void this.#run(() => this.#model.stage(paths));
  }

  unstageAll(): void {
    const paths = this.#staged.get().map((row) => row.path);
    if (paths.length > 0) void this.#run(() => this.#model.unstage(paths));
  }

  commit(): void {
    if (!this.canCommit) return;
    const message = this.#message.get();
    void this.#run(async () => {
      const hash = await this.#model.commit(message);
      if (hash !== null) {
        this.#lastCommit.set(hash.slice(0, 7));
        this.#message.set('');
      }
    });
  }

  openDiff(tabId: string): void {
    const parsed = parseDiffTabId(tabId);
    if (parsed === null || this.#requested.has(tabId)) return;
    this.#requested.add(tabId);
    void this.#model.loadDiff(parsed.path, parsed.staged);
  }

  diffOf(tabId: string): DiffState {
    const entry = this.#diffs.get()[tabId];
    if (entry === undefined) return { loading: true, text: '', failure: null };
    return { loading: entry.status === 'loading', text: entry.text, failure: entry.failure };
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
    this.#loading.set(this.#model.status === 'loading');
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
