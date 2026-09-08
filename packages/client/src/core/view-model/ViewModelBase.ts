/** atom이 최소로 갖춰야 하는 형태 — nanostores의 `ReadableAtom`과 구조적으로 호환된다(타입 의존 없음). */
interface Listenable {
  listen(listener: () => void): () => void;
}

/**
 * ViewModel 구현이 상속해 atom 구독 배선을 얻는 베이스 클래스.
 *
 * **atom은 React 경계를 넘지 않는다** — 이게 (C) 설계의 핵심 불변식이다. 계약(`I<Name>ViewModel.ts`)은
 * atom을 노출하지 않고 값을 주는 getter만 선언한다. 구현은 `observe()`로 atom을 등록해 값이 바뀔
 * 때마다 내부 버전을 올리고, atom 자체는 반환값으로 받아 `#private` 필드에 보관한다 — getter가
 * `.get()`한 plain 값만 밖으로 나간다.
 *
 * ```ts
 * class ShellViewModelImpl extends ViewModelBase implements ShellViewModel {
 *   readonly #activities = this.observe(computed([...], ...));
 *   get activities(): readonly Activity[] { return this.#activities.get(); }
 * }
 * ```
 *
 * `useViewModel`은 `subscribe`/`getVersion` 두 메서드만 `useSyncExternalStore`에 넘기면 되므로
 * 값 캐시도 프록시도 필요 없다(배경은 `useViewModel.ts`의 문서 주석 참고).
 */
export abstract class ViewModelBase {
  #version = 0;
  #listeners = new Set<() => void>();

  /**
   * atom을 구독 대상에 편입시키고 그대로 돌려준다(체이닝용) — `readonly #x = this.observe(atom(0))`.
   * 값이 바뀔 때마다 내부 버전을 올려 등록된 모든 리스너(`useSyncExternalStore`의 `onStoreChange`)를
   * 부른다.
   */
  protected observe<A extends Listenable>(atom: A): A {
    atom.listen(() => {
      this.#version += 1;
      for (const listener of this.#listeners) listener();
    });
    return atom;
  }

  /** `useSyncExternalStore`의 subscribe. 화살표 필드라 인스턴스에 영구 bound — 매 렌더 동일 참조. */
  readonly subscribe = (onStoreChange: () => void): (() => void) => {
    this.#listeners.add(onStoreChange);
    return () => {
      this.#listeners.delete(onStoreChange);
    };
  };

  /** `useSyncExternalStore`의 getSnapshot. 값 자체가 아니라 버전 정수만 줘 비교 비용이 O(1)이다. */
  readonly getVersion = (): number => this.#version;
}
