import type { SearchMatch, SearchRequest, SearchResponse } from "#contracts";

export type { SearchMatch, SearchResponse };

/** 화면이 정하는 검색 조건 — 서버 요청과 같은 모양이되 `maxResults`는 여기서 정하지 않는다. */
export type SearchQuery = Pick<SearchRequest, "query" | "path" | "regex" | "caseSensitive">;

declare module "#core/di" {
  /** `ISearchService`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.search.service": ISearchService;
  }
}
/**
 * 워크스페이스 전체 텍스트 검색 통로. VSCode의 `ISearchService`에 해당한다.
 * 실패는 던진다 — 메시지는 사람이 읽을 수 있는 말이다.
 */
export interface ISearchService {
  search(query: SearchQuery): Promise<SearchResponse>;
}
