import type { Descriptor, Registry } from '#core/registry';
import type { ContextRegistry } from '#core/action';

/**
 * Menu — 메뉴 id별로 커맨드를 기여하는 것. VSCode의 `contributes.menus`와 같은 모양이다.
 *
 * Action(무엇을 할 수 있는가)을 그대로 참조한다 — 메뉴는 Action을 실행하는 트리거 하나일 뿐,
 * 자기만의 동작을 갖지 않는다(Keybinding이 트리거인 것과 같은 구도).
 *
 * 계약과 매칭 전부 순수하다(DOM 타입이 전혀 없다) — 그래도 common이 아니라 client에 있다:
 * 메뉴는 keybinding과 마찬가지로 브라우저/UI 개념이라 서버가 쓸 일이 없다. common에는 서버·
 * 클라이언트 둘 다 실제로 쓰는 action·context만 남긴다.
 *
 * `id`는 이 등록 자체의 고유 식별자다 — `menuId`(어느 메뉴인지)나 `commandId`(무엇을 실행할지)가
 * 아니다. 같은 메뉴·같은 커맨드라도 `when`이 다른 등록을 여럿 둘 수 있어야 하기 때문이다
 * (Keybinding과 같은 이유).
 */
export interface MenuItemDescriptor extends Descriptor {
  readonly id: string;
  /** 어느 메뉴에 기여하는지 — 예: `'explorer.context'`. */
  readonly menuId: string;
  /** Action Registry에서 조회할 id. */
  readonly commandId: string;
  /** Context Registry를 받아 조건을 읽는다 — 구현부가 DOM 등 다른 경로로 조건을 판단하는 걸 막는다. */
  readonly when?: (ctx: ContextRegistry) => boolean;
  /** VSCode 스타일 정렬 그룹 — 예: `'1_create'`·`'9_danger'`. 사전순으로 그룹을 가른다. */
  readonly group?: string;
  /** 같은 그룹 안에서의 순서. */
  readonly order?: number;
}

/** 한 메뉴의 항목들은 `group` 사전순, 그 안에서 `order` 순으로 나온다. */
export type MenuRegistry = Registry<MenuItemDescriptor>;

/**
 * `menuId`에 기여된 항목 중 `when`을 만족하는 것만, `group`·`order`로 정렬해 돌려준다.
 *
 * `matchKeybinding`과 달리 여럿을 돌려준다 — 메뉴는 "눌린 것 하나"가 아니라 "지금 보일 목록
 * 전체"를 그려야 하기 때문이다.
 */
export const matchMenuItems = (registry: MenuRegistry, contextRegistry: ContextRegistry, menuId: string): MenuItemDescriptor[] =>
  registry
    .list()
    .filter((item) => item.menuId === menuId && (item.when === undefined || item.when(contextRegistry)))
    .sort((a, b) => {
      const byGroup = (a.group ?? '').localeCompare(b.group ?? '');
      return byGroup !== 0 ? byGroup : (a.order ?? 0) - (b.order ?? 0);
    });
