import { useCallback } from 'react';
import { useControlledState } from '#utils/useControlledState';
import type { AgentSessionItem } from './SessionList';

export interface UseSessionListOptions {
  /** controlled 모드일 때 부모가 관리하는 활성 세션 id. */
  readonly activeId?: string;
  /** uncontrolled 모드의 시작 활성 세션 id. */
  readonly defaultActiveId?: string;
  /** 활성 세션이 바뀔 때마다 호출된다(controlled 여부와 무관). */
  readonly onActiveChange?: (session: AgentSessionItem) => void;
  /** 활성 세션의 id만 필요할 때 쓴다(controlled 여부와 무관) — 세션 객체 전체가 필요하면
   * `onActiveChange`를 쓴다. `activeId`가 바뀔 때마다 `onActiveChange`와 함께 호출된다. */
  readonly onActiveIdChange?: (activeId: string) => void;
}

export interface UseSessionListResult {
  readonly activeId: string | undefined;
  readonly selectSession: (session: AgentSessionItem) => void;
}

/**
 * 활성 세션 하나를 controlled/uncontrolled 하이브리드로 관리한다. 값 자체의 controlled/uncontrolled
 * 분기는 `useControlledState`가 맡고, 이 훅은 그 위에 "disabled 세션은 선택되지 않는다"는 도메인
 * 규칙만 얹는다. `onActiveIdChange`는 `useControlledState`의 `onChange`로 그대로 연결하고,
 * 세션 객체 전체가 필요한 `onActiveChange`는 id만 받는 그 콜백 모양과 안 맞아 `selectSession`에서
 * 별도로 호출한다(둘 다 같은 시점에 함께 불린다).
 */
export function useSessionList({ activeId, defaultActiveId, onActiveChange, onActiveIdChange }: UseSessionListOptions): UseSessionListResult {
  const [currentActiveId, setActiveId] = useControlledState<string | undefined>({
    value: activeId,
    defaultValue: defaultActiveId,
    onChange: (nextActiveId) => {
      if (nextActiveId !== undefined) onActiveIdChange?.(nextActiveId);
    },
  });

  const selectSession = useCallback(
    (session: AgentSessionItem) => {
      if (session.disabled) return;
      setActiveId(session.id);
      onActiveChange?.(session);
    },
    [setActiveId, onActiveChange],
  );

  return { activeId: currentActiveId, selectSession };
}
