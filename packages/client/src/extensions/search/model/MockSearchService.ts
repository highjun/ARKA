import type { ISearchService, SearchMatch, SearchQuery, SearchResponse } from "./ISearchService";

/** 메모리 안의 `ISearchService` — 경로 → 내용의 표를 찾는다. 실물과 같은 스위트(`searchService.contract.ts`)를 통과한다. */
export class MockSearchService implements ISearchService {
  readonly #files = new Map<string, string>();
  #maxResults = 200;

  /** `maxResults`를 낮춰 잘림 동작을 테스트에서 재현한다. */
  constructor(files: Readonly<Record<string, string>> = {}, { maxResults = 200 }: { maxResults?: number } = {}) {
    this.seed(files);
    this.#maxResults = maxResults;
  }

  /** 파일을 더 심는다. 같은 경로면 덮어쓴다. */
  seed(files: Readonly<Record<string, string>>): void {
    for (const [path, content] of Object.entries(files)) this.#files.set(path, content);
  }

  /** `regex`가 아니면 질의를 이스케이프한다 — 리터럴 검색에서 `.`이 와일드카드가 되지 않게. */
  search({ query, path, regex, caseSensitive }: SearchQuery): Promise<SearchResponse> {
    const source = regex ? query : query.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const pattern = new RegExp(source, caseSensitive ? "gu" : "giu");
    const prefix = path === "" ? "" : `${path.replace(/\/+$/u, "")}/`;
    const matches: SearchMatch[] = [];
    let filesScanned = 0;
    let truncated = false;
    for (const [file, content] of [...this.#files].sort(([a], [b]) => a.localeCompare(b, "en"))) {
      if (!file.startsWith(prefix)) continue;
      filesScanned += 1;
      for (const [index, text] of content.split(/\r?\n/u).entries()) {
        pattern.lastIndex = 0;
        for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
          matches.push({ path: file, line: index + 1, column: match.index + 1, preview: text });
          if (matches.length >= this.#maxResults) {
            truncated = true;
            return Promise.resolve({ matches, truncated, filesScanned });
          }
          if (match[0] === "") pattern.lastIndex += 1;
        }
      }
    }
    return Promise.resolve({ matches, truncated, filesScanned });
  }
}
