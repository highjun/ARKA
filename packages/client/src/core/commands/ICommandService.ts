import type { Collection, Registry } from "#core/registry";
import type { ActionDescriptor, ContextDescriptor, Keybinding, MenuItem } from "./descriptors";

declare module "#core/di" {
  /** 명령 서비스를 컨테이너에서 꺼내는 자리. 커널 것이지만 등록은 조립부가 한다. */
  interface InstanceMap {
    "arka.commands": ICommandService;
  }
}

/**
 * 그릇 넷을 함께 들고 **실행까지 하는** 자리. 확장은 이것 하나만 안다.
 *
 * 담는 것은 각 확장이 `activate`에서 `actions.add(…)`로 한다. 여기는 담긴 것을 **부르는** 일만 더한다.
 * 명령과 문맥은 id로 찾으므로 `Registry`, 키바인딩과 메뉴 항목은 걷기만 하므로 `Collection`이다.
 */
export interface ICommandService {
  readonly actions: Registry<ActionDescriptor>;
  readonly contexts: Registry<ContextDescriptor>;
  /** 확장이 기여한 **기본값**. 사용자 재정의는 `overrides`가 든다 — 여기는 안 변한다. */
  readonly keybindings: Collection<Keybinding>;
  readonly menus: Collection<MenuItem>;

  /** 사용자 재정의 전부 — `actionId → 키`. `null`이면 기본값을 꺼 둔 것이다. */
  readonly overrides: ReadonlyMap<string, string | null>;
  /** 재정의를 쓴다. 저장소에 남고 `matchKeybinding`이 곧바로 이것을 먼저 본다. */
  setKeybinding(actionId: string, keybinding: string | null): void;

  /** 눌린 키에 맞고 조건을 통과하는 키바인딩. **재정의를 먼저 본다.** 없으면 `undefined`. */
  matchKeybinding(event: KeyboardEvent): Keybinding | undefined;
  /** 그 메뉴에 붙고 조건을 통과하는 항목들. 확장 순서·`order` 순으로 정렬돼 온다. */
  matchMenuItems(menuId: string): readonly MenuItem[];

  /** 실행했으면 `true` — 전역 keydown 리스너가 이 값으로 `preventDefault` 여부를 정한다. */
  dispatchKeydown(event: KeyboardEvent): boolean;
  /** 팔레트·메뉴·상태 칸이 부른다. 실행 중 던진 것은 여기서 잡아 보고한다 — 자신은 던지지 않는다. */
  execute(actionId: string, context?: unknown): void;
}
