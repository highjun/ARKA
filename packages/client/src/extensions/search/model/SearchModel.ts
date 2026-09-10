import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { ISearchModel, SearchStatus } from './ISearchModel';
import type { ISearchService, SearchQuery, SearchResponse } from './ISearchService';

/** `ISearchModel`의 유일한 구현체. 늦게 끝난 옛 검색이 새 결과를 덮지 않게 순번을 센다. */
export class SearchModel implements ISearchModel {
  readonly #service: ISearchService;
  readonly #changed = new Emitter();
  #query: SearchQuery = { query: '', path: '', regex: false, caseSensitive: false };
  #status: SearchStatus = 'idle';
  #result: SearchResponse | null = null;
  #failure: string | null = null;
  #generation = 0;

  constructor({ searchService }: { searchService: ISearchService }) {
    this.#service = searchService;
  }

  get query(): SearchQuery {
    return this.#query;
  }

  get status(): SearchStatus {
    return this.#status;
  }

  get result(): SearchResponse | null {
    return this.#result;
  }

  get failure(): string | null {
    return this.#failure;
  }

  setQuery(patch: Partial<SearchQuery>): void {
    this.#query = { ...this.#query, ...patch };
    this.#changed.fire();
  }

  async run(): Promise<void> {
    const generation = ++this.#generation;
    if (this.#query.query.trim() === '') {
      this.#result = null;
      this.#status = 'idle';
      this.#failure = null;
      this.#changed.fire();
      return;
    }
    this.#status = 'searching';
    this.#changed.fire();
    try {
      const result = await this.#service.search(this.#query);
      // 그 사이 새 검색이 나갔다.
      if (generation !== this.#generation) return;
      this.#result = result;
      this.#status = 'done';
      this.#failure = null;
    } catch (error) {
      if (generation !== this.#generation) return;
      this.#status = 'error';
      this.#failure = error instanceof Error ? error.message : String(error);
    }
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
