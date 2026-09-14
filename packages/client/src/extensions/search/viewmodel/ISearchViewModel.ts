import { createToken } from "#core/di";

/** 줄·열은 1부터. `preview`는 그 줄의 원문이라 화면이 잘라 쓴다. */
type SearchMatchRow = {
  readonly line: number;
  readonly column: number;
  readonly preview: string;
};

/** 파일 하나로 묶은 결과 — 화면은 파일 단위로 접었다 편다. */
export type SearchFileRow = {
  readonly path: string;
  readonly matches: readonly SearchMatchRow[];
};

export const SearchViewModelToken = createToken<ISearchViewModel>("searchViewModel");
/** 검색 패널의 화면 상태. 입력은 곧바로 Model 조건에 반영하고, 검색은 짧은 디바운스 뒤에 나간다. */
export interface ISearchViewModel {
  readonly query: string;
  readonly regex: boolean;
  readonly caseSensitive: boolean;
  readonly searching: boolean;
  readonly rows: readonly SearchFileRow[];
  /** "12개 파일에서 34개" 같은 요약. 검색 전이면 빈 문자열. */
  readonly summary: string;
  readonly failure: string | null;

  setQuery(query: string): void;
  toggleRegex(): void;
  toggleCaseSensitive(): void;
  /** 디바운스를 기다리지 않고 지금 찾는다(Enter). */
  submit(): void;
  onDispose(): void;
}
