import { useCallback, useState } from 'react';

export interface UseControlledStateOptions<T> {
  /** controlled 모드일 때 부모가 관리하는 현재 값. `undefined`면 uncontrolled로 동작한다. */
  readonly value?: T;
  /** uncontrolled 모드의 초깃값. */
  readonly defaultValue: T;
  /** controlled 여부와 무관하게 값이 바뀌어야 할 때마다 호출된다. */
  readonly onChange?: (value: T) => void;
}

/**
 * `<state>`/`default<State>`/`on<State>Change` 세 쌍으로 표현되는 controlled/uncontrolled
 * 하이브리드 상태를 구현한다(Radix `useControllableState`/React Aria `useControlledState`와
 * 동일한 패턴). uncontrolled 모드에서도 내부적으로 React state를 소유해 반환값을 항상
 * "지금 렌더링에 써야 할 단일 진실"로 만든다 — 호출부가 controlled/uncontrolled를 분기해서
 * 처리할 필요가 없다.
 */
export function useControlledState<T>({ value, defaultValue, onChange }: UseControlledStateOptions<T>): readonly [T, (next: T) => void] {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolledValue(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [currentValue, setValue] as const;
}
