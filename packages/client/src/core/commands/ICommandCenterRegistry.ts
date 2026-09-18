import { createToken } from "#core/di";
import type {
  ActionDescriptor,
  ActionRegistry,
  ContextDescriptor as CoreContextDescriptor,
  ContextRegistry as CoreContextRegistry,
} from "#core/action";
import type {
  KeybindingDescriptor as CoreKeybindingDescriptor,
  KeybindingRegistry as CoreKeybindingRegistry,
  MenuItemDescriptor as CoreMenuItemDescriptor,
  MenuRegistry as CoreMenuRegistry,
} from "#core/menu";

/**
 * VSCode 용어에 맞춘 얇은 별칭 — 구현은 `core`의 `ActionDescriptor`/`ActionRegistry` 그대로다.
 * "Action"보다 "Command"가 이 앱에서 부르기로 한 이름이라 여기서만 바꿔 부른다.
 */
export type CommandDescriptor<TContext = unknown> = ActionDescriptor<TContext>;
/** 등록된 커맨드 전부. 팔레트가 이 목록을 그대로 그린다. */
export type CommandRegistry<TContext = unknown> = ActionRegistry<TContext>;

/**
 * `core`의 타입을 그대로 재노출한다 — 계약 파일(`I*.ts`)은 타입 별칭 선언만 담을 수 있어
 * (`arka/model-type-only`) 소스 없는 `export type { X }` 재export 목록 대신 별칭으로 하나씩 편다.
 */
export type ContextDescriptor = CoreContextDescriptor;
/** 지금 상황을 나타내는 atom들 — `when` 조건이 여기서 값을 읽는다. */
export type ContextRegistry = CoreContextRegistry;
/** 키 조합 하나와 그것이 부를 커맨드. `when`으로 언제 듣는지 정한다. */
export type KeybindingDescriptor = CoreKeybindingDescriptor;
/** 같은 키에 `when`이 다른 등록을 여럿 둘 수 있다. */
export type KeybindingRegistry = CoreKeybindingRegistry;
/** 어느 메뉴에 어떤 커맨드를 어느 자리로 기여할지. */
export type MenuItemDescriptor = CoreMenuItemDescriptor;
/** 한 메뉴의 항목들은 `group` 사전순, 그 안에서 `order` 순으로 나온다. */
export type MenuRegistry = CoreMenuRegistry;

/**
 * Shell이 갖는 "커맨드 센터" — 커맨드·컨텍스트·키바인딩·메뉴를 한데 쥔다. 탭·활동·테마를 다루는
 * `ITabsModel`·`IActivityModel`·`IThemeModel`과 성격이 달라(VSCode도 CommandService/
 * ContextKeyService/KeybindingService/MenuService를 따로 둔다) 별도 슬라이스로 뒀다.
 *
 * 넷 다 `core`의 `Registry`로 이 Registry가 만들고, 앱 시작 시(`registerServices.tsx`)
 * 한 번 채워진다.
 */
export const CommandCenterRegistryToken = createToken<ICommandCenterRegistry>("commandCenterRegistry");
/** 넷을 한데 쥔 조립부의 창구. 등록은 부팅 때 한 번, 조회는 화면이 필요할 때마다. */
export interface ICommandCenterRegistry {
  readonly commandRegistry: CommandRegistry;
  readonly contextRegistry: ContextRegistry;
  readonly keybindingRegistry: KeybindingRegistry;
  readonly menuRegistry: MenuRegistry;

  registerCommand(descriptor: CommandDescriptor): void;
  registerContext(descriptor: ContextDescriptor): void;
  registerKeybinding(descriptor: KeybindingDescriptor): void;
  registerMenuItem(descriptor: MenuItemDescriptor): void;

  /**
   * 눌린 키(`ctrl+k` 형태로 정규화된 문자열)에 맞는 키바인딩을 찾아 그 커맨드를 실행한다.
   * 실행했으면 `true` — 호출부(전역 keydown 리스너)가 이 값으로 `preventDefault` 여부를 정한다.
   */
  dispatchKeydown(pressed: string): boolean;
}
