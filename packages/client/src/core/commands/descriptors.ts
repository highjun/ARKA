import type { Descriptor, Registry } from "#core/registry";

/**
 * 이름 붙은 동작 하나. `when`이 없다 — 조건은 트리거가 든다.
 *
 * 바로 끝내거나(저장·닫기) 상호작용을 시작한다(새 파일·이름 바꾸기). 어느 쪽이든 **결과를 돌려주지도
 * 기다리지도 않는다.** 시작한 상호작용은 상태와 화면이 이어받는다.
 */
export interface ActionDescriptor<TContext = unknown> extends Descriptor {
  readonly label: string;
  readonly execute: (context: TContext) => void;
}

/** 트리거가 조건을 물어보는 값. id는 점 네임스페이스다 — `tab.active.kind`. */
export interface ContextDescriptor extends Descriptor {
  /** 값이 아니라 읽는 법을 등록한다. 트리거가 `when`을 풀 때마다 다시 읽는다. */
  readonly value: () => unknown;
}

/** 키 하나에 명령 하나. id가 없다 — 눌린 키로 걷지 찾지 않는다. */
export interface Keybinding {
  /** `ctrl+k` 형태. Ctrl과 Cmd를 둘 다 `ctrl`로 합친다. */
  readonly keybinding: string;
  readonly actionId: string;
  readonly when?: (ctx: Registry<ContextDescriptor>) => boolean;
}

/**
 * 메뉴 한 자리에 명령 하나. id가 없다 — `menuId`로 걷지 찾지 않는다.
 *
 * 정렬 그룹이 없다. **어느 확장이 냈는지가 곧 묶음**이라 커널이 이미 안다 — `add`될 때 켜는 중인
 * 확장의 id가 기록된다. 묶음 순서는 배럴 순서다.
 */
export interface MenuItem {
  /** 어느 메뉴에 기여하는지 — `explorer.context`·`shell.tab.context`. */
  readonly menuId: string;
  readonly actionId: string;
  readonly when?: (ctx: Registry<ContextDescriptor>) => boolean;
  /** 같은 확장이 낸 것들 사이의 순서. */
  readonly order?: number;
}
