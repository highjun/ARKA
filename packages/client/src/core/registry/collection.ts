import { currentActivation, type Activation } from "./activation";

/** `Collection`에 담긴 항목 하나와 그것을 낸 확장. */
export interface CollectionEntry<T> {
  readonly item: T;
  /** 켜는 중이 아닐 때 `add`됐으면(커널 자신·테스트) `undefined`. */
  readonly activation: Activation | undefined;
}

/**
 * id 없이 담기만 하는 그릇. **걷기만 하고 찾지 않는 것**이 여기 온다 — 키바인딩·메뉴 항목.
 * `Registry`와 같은 규칙이다: `activate` 안에서만 `add`하고 그 뒤로 안 변한다.
 */
export class Collection<T> {
  readonly #entries: CollectionEntry<T>[] = [];

  /** 지금 켜는 중인 확장의 id가 같이 기록된다 — 메뉴 묶음이 이것으로 갈린다. */
  add(item: T): void {
    this.#entries.push({ item, activation: currentActivation() });
  }

  /** 담은 순서 그대로. */
  list(): readonly T[] {
    return this.#entries.map((entry) => entry.item);
  }

  /** 누가 냈는지까지. 확장 단위로 묶어야 하는 쪽(메뉴)이 읽는다. */
  entries(): readonly CollectionEntry<T>[] {
    return [...this.#entries];
  }
}
