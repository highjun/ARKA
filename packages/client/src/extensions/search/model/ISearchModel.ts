import type { Disposable } from "#core/di";
import type { SearchQuery, SearchResponse } from "./ISearchService";

/** 빈 질의로 `run`하면 `idle`로 되돌아간다 — `done`이 아니다. */
export type SearchStatus = "idle" | "searching" | "done" | "error";

declare module "#core/di" {
  /** `ISearchModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.search.model": ISearchModel;
  }
}
/**
 * 마지막 검색 조건과 결과를 소유한다. 조건을 바꿔도 `run`을 부르기 전까지 결과는 그대로다 —
 * 타이핑마다 서버를 치지 않기 위해서다(디바운스는 ViewModel의 사정).
 */
export interface ISearchModel {
  readonly query: SearchQuery;
  readonly status: SearchStatus;
  /** 마지막으로 성공한 결과. 아직 없으면 `null`. */
  readonly result: SearchResponse | null;
  readonly failure: string | null;

  setQuery(patch: Partial<SearchQuery>): void;
  /** 지금 조건으로 찾는다. 빈 검색어면 결과를 비우고 `idle`로 돌아간다. 실패는 `failure`에 남기고 던지지 않는다. */
  run(): Promise<void>;
  onDidChange(listener: () => void): Disposable;
}
