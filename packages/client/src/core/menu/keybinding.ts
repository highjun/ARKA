import type { Descriptor, Registry } from "#core/registry";
import type { ContextRegistry } from "#core/action";

/**
 * Keybinding — Action Registry(무엇을 할 수 있는가)와 Context Registry(지금 상황이 어떤가)를
 * 조합해 "이 키가 눌렸을 때 이 Action 을 실행한다"를 판단한다.
 *
 * 계약과 매칭 자체는 순수하다(`matchKeybinding`은 이미 정규화된 키 문자열을 받는다) — 그래도
 * common이 아니라 여기 client에 있다: keybinding은 브라우저/UI 개념이라 서버가 쓸 일이 없다.
 * 브라우저 `KeyboardEvent`를 정규화된 키 문자열로 바꾸는 `normalizeKeybinding`도 같은 이유로
 * 바로 옆(`./normalize`)에 있다.
 *
 * `id` 는 keybinding 문자열이나 actionId 가 아니라 **등록 자체의 고유 식별자**다 — 같은 키에
 * 서로 다른 `when` 으로 여러 개를 등록할 수 있어야 하기 때문이다.
 */
export interface KeybindingDescriptor extends Descriptor {
  readonly id: string;
  /** 예: `ctrl+k` */
  readonly keybinding: string;
  /** Action Registry 에서 조회할 id */
  readonly actionId: string;
  /** Context Registry 를 받아 조건을 읽는다 — 구현부가 DOM 등 다른 경로로 조건을 판단하는 걸 막는다. */
  readonly when?: (ctx: ContextRegistry) => boolean;
}

/** 같은 키에 `when`이 다른 등록을 여럿 둘 수 있다 — 조회는 조건을 만족하는 것만 고른다. */
export type KeybindingRegistry = Registry<KeybindingDescriptor>;

/**
 * 눌린 키에 맞는 등록을 찾는다.
 *
 * 여러 개가 동시에 매칭되면(둘 다 `when` 을 만족) 어떤 게 뽑힐지는 **정의돼 있지 않다** —
 * 등록할 때 `when` 조건이 서로 겹치지 않게 하는 게 전제다(대개 focus/mode 처럼 상호 배타적인
 * 컨텍스트를 쓰면 자연히 안 겹친다). 여기서는 순회 중 첫 매칭을 돌려준다.
 */
export const matchKeybinding = (
  registry: KeybindingRegistry,
  contextRegistry: ContextRegistry,
  pressed: string,
): KeybindingDescriptor | undefined =>
  registry.list().find((entry) => entry.keybinding === pressed && (!entry.when || entry.when(contextRegistry)));
