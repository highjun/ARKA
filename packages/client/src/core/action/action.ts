import type { Descriptor, Registry } from '#core/registry';

/**
 * Action — 트리거도 `when` 도 모르는 순수 동작 정의.
 *
 * `when`(실행 가능 조건)을 Action 자체에서 뺐다 — 같은 Action 이라도 트리거마다 다른 조건을 걸어야
 * 하기 때문이다(키바인딩에서는 조건 A, 메뉴에서는 조건 B). 조건은 트리거 등록 쪽이 갖는다.
 */
export interface ActionDescriptor<TContext = unknown> extends Descriptor {
  readonly id: string;
  readonly label: string;
  readonly execute: (context: TContext) => void;
}

/** 등록/조회는 제네릭 `Registry` 를 그대로 재사용한다 — Action 전용 저장소를 따로 만들지 않는다. */
export type ActionRegistry<TContext = unknown> = Registry<ActionDescriptor<TContext>>;
