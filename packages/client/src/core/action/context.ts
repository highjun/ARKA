import type { ReadableAtom } from 'nanostores';
import type { Descriptor, Registry } from '#core/registry';

/**
 * Context — Model/ViewModel 이 이미 갖고 있는 atom 을 id 로 등록해두는 것뿐이다.
 *
 * 값을 옮겨 적지 않고 atom 자체를 등록하므로, 원본이 바뀌는 즉시 최신값이 보장된다 — 동기화를
 * 깜빡할 여지가 없다.
 *
 * id 는 점(dot)으로 네임스페이스한다 — 예: `tab.active.format`. 모듈끼리 서로 몰라도 되도록
 * 정적 타입으로 키를 합치지 않는 대신, 이름 규칙으로 충돌을 피한다.
 */
export interface ContextDescriptor extends Descriptor {
  readonly id: string;
  readonly atom: ReadableAtom<unknown>;
}

/** 지금 상황을 나타내는 atom들의 모음 — `when` 조건이 여기서 값을 읽는다. */
export type ContextRegistry = Registry<ContextDescriptor>;
