import type { ComponentType } from 'react';

// 서로 다른 props 모양의 컴포넌트를 전부 받아야 하는 범용 유틸이라 any가 맞다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NamedComponent = ComponentType<any> & { displayName?: string };

/**
 * Compound Component를 `Object.assign(Root, subs)`로 조립하면서 `displayName`을 자동으로
 * 계산한다(Root는 `name`, 각 서브컴포넌트는 `${name}.${key}`) — 조립과 명명을 한 호출로
 * 묶어, 둘 중 하나만 깜빡하는 실수 자체를 없앤다. 이미 자신만의 displayName을 가진(예: 그
 * 자체로 다시 compound인) 서브컴포넌트를 넘기면 그 값을 덮어쓴다 — 계층을 쌓고 싶으면(예:
 * `Tab.Split.Branch`) 안쪽 compound를 조립할 때 이미 `Split.Branch`가 되도록 하고, 바깥쪽
 * 조립에서 그 서브트리를 `{ Split }`로만 넘긴다.
 */
export function assembleCompound<Root extends NamedComponent, Subs extends Record<string, NamedComponent>>(
  name: string,
  root: Root,
  subs: Subs,
): Root & Subs {
  root.displayName = name;
  for (const [key, sub] of Object.entries(subs)) {
    sub.displayName = `${name}.${key}`;
  }
  return Object.assign(root, subs);
}
