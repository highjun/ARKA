/** 지금 켜는 중인 확장. `index`는 배럴 순서다 — 메뉴 묶음이 이 순서로 선다. */
export interface Activation {
  readonly id: string;
  readonly index: number;
}

let current: Activation | undefined;
let nextIndex = 0;

/**
 * `fn`이 도는 동안 "지금 켜는 중인 확장"을 `id`로 둔다. `activateExtensions`가 `activate`를 부를 때 감싼다.
 * 배럴 밖이라 확장은 이것을 모른다 — `Collection.add`만 읽는다.
 */
export const runActivating = <R>(id: string, fn: () => R): R => {
  const previous = current;
  current = { id, index: nextIndex };
  nextIndex += 1;
  try {
    return fn();
  } finally {
    current = previous;
  }
};

/** 켜는 중이 아니면(커널 자신·테스트) `undefined`. */
export const currentActivation = (): Activation | undefined => current;
