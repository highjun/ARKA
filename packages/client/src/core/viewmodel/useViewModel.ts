import { useEffect, useSyncExternalStore } from 'react';
import type { Token } from '#core/di';
import { useAppContext } from './ViewModelProvider';

/** VM이 선택적으로 구현하는 생명주기 — 있으면 `useViewModel`이 마운트/언마운트에 걸어준다. */
interface ViewModelLifecycle {
  onMount?(): void;
  onDispose?(): void;
}

const hasLifecycle = (vm: object): vm is ViewModelLifecycle => 'onMount' in vm || 'onDispose' in vm;

/**
 * `<Name>View.tsx`는 훅을 `useViewModel` 하나만 부른다(`view-only-uses-view-model`) — `useEffect`로
 * VM의 마운트/언마운트 생명주기(구독 시작·정지 등)를 거는 자리가 View엔 없다는 뜻이다. 그 자리를
 * 여기 프레임워크 안에 대신 둔다 — VM이 `onMount`/`onDispose`를 구현하면 자동으로 불린다.
 *
 * `vm`(항상 원본 인스턴스)을 의존성으로 준다 — `.scoped()`/`.singleton()`이라 컴포넌트가 살아있는
 * 한 같은 인스턴스이므로 사실상 마운트 1회·언마운트 1회다.
 */
const useVmLifecycle = (vm: object): void => {
  useEffect(() => {
    if (!hasLifecycle(vm)) return undefined;
    vm.onMount?.();
    return () => vm.onDispose?.();
  }, [vm]);
};

/**
 * `ViewModelBase`가 주는 구독 표면 — 덕타이핑으로 감지한다. atom을 하나도 갖지 않는 대상(예:
 * `Registry`)은 `ViewModelBase`를 상속하지 않아도 되고, 그런 경우 이 훅은 구독할 것이 없으니 그냥
 * 지나간다.
 */
interface Observable {
  subscribe(onStoreChange: () => void): () => void;
  getVersion(): number;
}

const isObservable = (vm: object): vm is Observable =>
  typeof (vm as Partial<Observable>).subscribe === 'function' &&
  typeof (vm as Partial<Observable>).getVersion === 'function';

const noSubscription = () => () => {};
const noVersion = () => 0;

/**
 * `useViewModel` 은 토큰으로 ViewModel(또는 atom이 없는 `Registry`)을 꺼낸다 —
 * `const vm = useViewModel(TodoListViewModelToken)`.
 *
 * 토큰이 계약 타입을 들고 있으므로 반환 타입이 추론된다 — 호출부가 타입 인자를 따로
 * 말할 필요가 없고, 이름과 계약이 어긋날 자리도 없다.
 *
 * ViewModel 은 항상 컨테이너가 관리하는 클래스 인스턴스다 — View 생명주기와 분리돼 mount/unmount
 * 와 무관하게 산다. **View(`<Name>View.tsx`)만** 이 hook을 호출한다.
 *
 * **atom은 React 경계를 넘지 않는다** — VM 계약은 atom을 노출하지 않고 plain 값을 주는 getter만
 * 선언하며, 구현이 `ViewModelBase.observe()`로 atom을 감싸 값을 대신 노출한다. 그래서 이 훅은
 * 값을 감싸거나 프록시로 가로챌 게 없다 — `ViewModelBase`를 상속한 VM이면 `subscribe`/`getVersion`
 * 을 구독해 값이 바뀔 때마다 재렌더시키고, 반환값은 항상 **원본 인스턴스**다(정체성이 렌더 사이에
 * 영구 안정 — DI 접근과 구독이 한 곳에 모인다는 게 이 hook 하나만 허용하는 이유다).
 *
 * `useMemo` 로 감싸지 않는다 — 컨테이너가 singleton/scoped 를 이미 캐싱해서 별도
 * 메모이제이션이 필요 없다.
 */
export function useViewModel<T extends object>(token: Token<T>): T {
  const vm = useAppContext().resolve(token);
  useVmLifecycle(vm);
  const observable = isObservable(vm) ? vm : undefined;
  useSyncExternalStore(
    observable?.subscribe ?? noSubscription,
    observable?.getVersion ?? noVersion,
    observable?.getVersion ?? noVersion,
  );
  return vm;
}
