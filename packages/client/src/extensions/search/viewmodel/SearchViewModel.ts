import type { Disposable } from '#core/di';
import { ViewModelBase } from '#core/view-model';
import { atom } from 'nanostores';
import type { ISearchModel } from '../model/ISearchModel';
import type { ISearchViewModel, SearchFileRow } from './ISearchViewModel';

/** 타이핑이 멈춘 뒤 이만큼 기다렸다가 찾는다. */
const DEBOUNCE_MS = 250;

/** `ISearchViewModel`의 유일한 구현체. */
export class SearchViewModel extends ViewModelBase implements ISearchViewModel {
  readonly #model: ISearchModel;
  readonly #debounceMs: number;
  readonly #query;
  readonly #regex;
  readonly #caseSensitive;
  readonly #searching;
  readonly #rows;
  readonly #summary;
  readonly #failure;
  readonly #subscription: Disposable;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor({ searchModel, debounceMs = DEBOUNCE_MS }: { searchModel: ISearchModel; debounceMs?: number }) {
    super();
    this.#model = searchModel;
    this.#debounceMs = debounceMs;
    this.#query = this.observe(atom(searchModel.query.query));
    this.#regex = this.observe(atom(searchModel.query.regex));
    this.#caseSensitive = this.observe(atom(searchModel.query.caseSensitive));
    this.#searching = this.observe(atom(searchModel.status === 'searching'));
    this.#rows = this.observe(atom(this.#computeRows()));
    this.#summary = this.observe(atom(this.#computeSummary()));
    this.#failure = this.observe(atom(searchModel.failure));
    this.#subscription = searchModel.onDidChange(() => this.#recompute());
  }

  onDispose(): void {
    this.#subscription.dispose();
    if (this.#timer !== null) clearTimeout(this.#timer);
  }

  get query(): string {
    return this.#query.get();
  }

  get regex(): boolean {
    return this.#regex.get();
  }

  get caseSensitive(): boolean {
    return this.#caseSensitive.get();
  }

  get searching(): boolean {
    return this.#searching.get();
  }

  get rows(): readonly SearchFileRow[] {
    return this.#rows.get();
  }

  get summary(): string {
    return this.#summary.get();
  }

  get failure(): string | null {
    return this.#failure.get();
  }

  setQuery(query: string): void {
    this.#model.setQuery({ query });
    this.#schedule();
  }

  toggleRegex(): void {
    this.#model.setQuery({ regex: !this.#model.query.regex });
    this.#schedule();
  }

  toggleCaseSensitive(): void {
    this.#model.setQuery({ caseSensitive: !this.#model.query.caseSensitive });
    this.#schedule();
  }

  submit(): void {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
    void this.#model.run();
  }

  #schedule(): void {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.#model.run();
    }, this.#debounceMs);
  }

  #computeRows(): readonly SearchFileRow[] {
    const result = this.#model.result;
    if (result === null) return [];
    const byPath = new Map<string, SearchFileRow['matches'][number][]>();
    for (const match of result.matches) {
      const list = byPath.get(match.path) ?? [];
      list.push({ line: match.line, column: match.column, preview: match.preview });
      byPath.set(match.path, list);
    }
    return [...byPath].map(([path, matches]) => ({ path, matches }));
  }

  #computeSummary(): string {
    const result = this.#model.result;
    if (result === null) return '';
    const files = new Set(result.matches.map((m) => m.path)).size;
    if (result.matches.length === 0) return '결과 없음';
    return `${String(files)}개 파일에서 ${String(result.matches.length)}개${result.truncated ? ' (더 있음)' : ''}`;
  }

  #recompute(): void {
    this.#query.set(this.#model.query.query);
    this.#regex.set(this.#model.query.regex);
    this.#caseSensitive.set(this.#model.query.caseSensitive);
    this.#searching.set(this.#model.status === 'searching');
    this.#rows.set(this.#computeRows());
    this.#summary.set(this.#computeSummary());
    this.#failure.set(this.#model.failure);
  }
}
