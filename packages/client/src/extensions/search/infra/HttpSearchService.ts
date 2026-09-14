import { apiHeaders } from "#core/http";
import { SearchResponse } from "#contracts";
import type { ISearchService, SearchQuery } from "../model/ISearchService";

/** `GET /api/search`를 읽는 구현. 응답은 계약 스키마로 검증한다. */
class HttpSearchServiceAdapter implements ISearchService {
  static readonly #TIMEOUT_MS = 20_000;

  async search({ query, path, regex, caseSensitive }: SearchQuery): Promise<SearchResponse> {
    const params = new URLSearchParams({ query, path, regex: String(regex), caseSensitive: String(caseSensitive) });
    let response: Response;
    try {
      response = await fetch(`/api/search?${params.toString()}`, {
        headers: apiHeaders(),
        signal: AbortSignal.timeout(HttpSearchServiceAdapter.#TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof DOMException) throw new Error("응답이 없다 — 연결을 확인해 주세요.", { cause: error });
      throw error;
    }
    if (!response.ok) throw new Error(`검색이 실패했다 (${String(response.status)}).`);
    return SearchResponse.parse(await response.json());
  }
}

/** `ISearchService`의 실제 구현을 만든다. */
export const createSearchServicePort = (): ISearchService => new HttpSearchServiceAdapter();
