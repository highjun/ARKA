import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { ISearchModel, SearchStatus } from "./ISearchModel";
import type { ISearchService, SearchQuery, SearchResponse } from "./ISearchService";

/** `ISearchModel`의 유일한 구현체. 늦게 끝난 옛 검색이 새 결과를 덮지 않게 순번을 센다. */
export class SearchModel implements ISearchModel {
  readonly #service: ISearchService;
  readonly #changed = new Emitter();
  #query: SearchQuery = { query: "", path: "", regex: false, caseSensitive: false };
  #status: SearchStatus = "idle";
  #result: SearchResponse | null = null;
  #failure: string | null = null;
  #generation = 0;

  /** 만들기만 해서는 아무것도 찾지 않는다 — `run`을 불러야 한다. */
  constructor({ searchService }: { searchService: ISearchService }) {
    this.#service = searchService;
  }

  /** 마지막으로 **설정된** 조건이다 — 마지막으로 실행된 조건이 아니다. */
  get query(): SearchQuery {
    return this.#query;
  }

  /** 조건을 바꿔도 `run` 전까지는 그대로다. */
  get status(): SearchStatus {
    return this.#status;
  }

  /** 실패했어도 직전 결과가 남는다 — 화면을 비우지 않는다. */
  get result(): SearchResponse | null {
    return this.#result;
  }

  /** `status`가 `error`일 때만 값이 있다. */
  get failure(): string | null {
    return this.#failure;
  }

  /** 준 필드만 덮어쓴다. 검색을 시작하지는 않는다. */
  setQuery(patch: Partial<SearchQuery>): void {
    this.#query = { ...this.#query, ...patch };
    this.#changed.fire();
  }

  /** 세대 번호로 늦게 온 응답을 버린다 — 빨리 친 다음 질의가 앞의 결과에 덮이지 않게. */
  async run(): Promise<void> {
    const generation = ++this.#generation;
    if (this.#query.query.trim() === "") {
      this.#result = null;
      this.#status = "idle";
      this.#failure = null;
      this.#changed.fire();
      return;
    }
    this.#status = "searching";
    this.#changed.fire();
    try {
      const result = await this.#service.search(this.#query);
      // 그 사이 새 검색이 나갔다.
      if (generation !== this.#generation) return;
      this.#result = result;
      this.#status = "done";
      this.#failure = null;
    } catch (error) {
      if (generation !== this.#generation) return;
      this.#status = "error";
      this.#failure = error instanceof Error ? error.message : String(error);
    }
    this.#changed.fire();
  }

  /** 무엇이 바뀌었는지는 주지 않는다 — 받는 쪽이 다시 읽는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
