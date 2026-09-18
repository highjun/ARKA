import type { Disposable } from "#core/di";
import { makeAutoObservable, observable, observableRef } from "mobx";
import type { ISearchModel } from "../model/ISearchModel";
import type { ISearchViewModel, SearchFileRow } from "./ISearchViewModel";

/** 타이핑이 멈춘 뒤 이만큼 기다렸다가 찾는다. */
const DEBOUNCE_MS = 250;

/** `ISearchViewModel`의 유일한 구현체. */
export class SearchViewModel implements ISearchViewModel {
  readonly #model: ISearchModel;
  readonly #debounceMs: number;
  private queryState: string;
  private regexState: boolean;
  private caseSensitiveState: boolean;
  private searchingState: boolean;
  private rowsState: readonly SearchFileRow[];
  private summaryState: string;
  private failureState: string | null;
  readonly #subscription: Disposable;
  #timer: ReturnType<typeof setTimeout> | null = null;

  /** `debounceMs`를 0으로 주면 즉시 나간다 — 테스트가 타이머를 기다리지 않게. */
  constructor({ searchModel, debounceMs = DEBOUNCE_MS }: { searchModel: ISearchModel; debounceMs?: number }) {
    this.#model = searchModel;
    this.#debounceMs = debounceMs;
    this.queryState = searchModel.query.query;
    this.regexState = searchModel.query.regex;
    this.caseSensitiveState = searchModel.query.caseSensitive;
    this.searchingState = searchModel.status === "searching";
    this.rowsState = this.#computeRows();
    this.summaryState = this.#computeSummary();
    this.failureState = searchModel.failure;
    this.#subscription = searchModel.onDidChange(() => this.recompute());
    makeAutoObservable<
      this,
      | "queryState"
      | "regexState"
      | "caseSensitiveState"
      | "searchingState"
      | "rowsState"
      | "summaryState"
      | "failureState"
    >(
      this,
      {
        queryState: observable,
        regexState: observable,
        caseSensitiveState: observable,
        searchingState: observable,
        rowsState: observableRef,
        summaryState: observable,
        failureState: observable,
      },
      { autoBind: true },
    );
  }

  /** 구독과 예약된 타이머를 함께 끊는다 — 스코프가 정리될 때 컨테이너가 부른다. */
  onDispose(): void {
    this.#subscription.dispose();
    if (this.#timer !== null) clearTimeout(this.#timer);
  }

  /** 입력창의 현재 값이다 — 마지막으로 실행된 질의가 아니다. */
  get query(): string {
    return this.queryState;
  }

  /** 켜면 질의를 정규식으로 읽는다. */
  get regex(): boolean {
    return this.regexState;
  }

  /** 끄면 대소문자를 가리지 않는다. */
  get caseSensitive(): boolean {
    return this.caseSensitiveState;
  }

  /** 디바운스 대기 중에는 `false`다 — 실제로 나간 뒤에만 켜진다. */
  get searching(): boolean {
    return this.searchingState;
  }

  /** 파일 단위로 묶인다. 결과가 없으면 빈 배열이다. */
  get rows(): readonly SearchFileRow[] {
    return this.rowsState;
  }

  /** 화면에 그대로 쓰는 한 줄이다 — 개수 계산을 화면이 다시 하지 않게. */
  get summary(): string {
    return this.summaryState;
  }

  /** 실패했을 때만 값이 있다. */
  get failure(): string | null {
    return this.failureState;
  }

  /** 타이핑마다 불려도 된다 — 실제 검색은 디바운스 뒤에 나간다. */
  setQuery(query: string): void {
    this.#model.setQuery({ query });
    this.#schedule();
  }

  /** 바꾸고 디바운스로 다시 찾는다. */
  toggleRegex(): void {
    this.#model.setQuery({ regex: !this.#model.query.regex });
    this.#schedule();
  }

  /** 바꾸고 디바운스로 다시 찾는다. */
  toggleCaseSensitive(): void {
    this.#model.setQuery({ caseSensitive: !this.#model.query.caseSensitive });
    this.#schedule();
  }

  /** 예약된 디바운스를 취소하고 즉시 찾는다 — Enter가 부른다. */
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
    const byPath = new Map<string, SearchFileRow["matches"][number][]>();
    for (const match of result.matches) {
      const list = byPath.get(match.path) ?? [];
      list.push({ line: match.line, column: match.column, preview: match.preview });
      byPath.set(match.path, list);
    }
    return [...byPath].map(([path, matches]) => ({ path, matches }));
  }

  #computeSummary(): string {
    const result = this.#model.result;
    if (result === null) return "";
    const files = new Set(result.matches.map((m) => m.path)).size;
    if (result.matches.length === 0) return "결과 없음";
    return `${String(files)}개 파일에서 ${String(result.matches.length)}개${result.truncated ? " (더 있음)" : ""}`;
  }

  private recompute(): void {
    this.queryState = this.#model.query.query;
    this.regexState = this.#model.query.regex;
    this.caseSensitiveState = this.#model.query.caseSensitive;
    this.searchingState = this.#model.status === "searching";
    this.rowsState = this.#computeRows();
    this.summaryState = this.#computeSummary();
    this.failureState = this.#model.failure;
  }
}
