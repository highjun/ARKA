import { createToken } from '#core/di';
import type { ActionDescriptor, ActionRegistry, ContextDescriptor as CoreContextDescriptor, ContextRegistry as CoreContextRegistry } from '#core/action';
import type {
  KeybindingDescriptor as CoreKeybindingDescriptor,
  KeybindingRegistry as CoreKeybindingRegistry,
  MenuItemDescriptor as CoreMenuItemDescriptor,
  MenuRegistry as CoreMenuRegistry,
} from '#core/menu';

/**
 * VSCode 용어에 맞춘 얇은 별칭 — 구현은 `core`의 `ActionDescriptor`/`ActionRegistry` 그대로다.
 * "Action"보다 "Command"가 이 앱에서 부르기로 한 이름이라 여기서만 바꿔 부른다.
 */
export type CommandDescriptor<TContext = unknown> = ActionDescriptor<TContext>;
export type CommandRegistry<TContext = unknown> = ActionRegistry<TContext>;

/**
 * `core`의 타입을 그대로 재노출한다 — 계약 파일(`I*.ts`)은 타입 별칭 선언만 담을 수 있어
 * (`arka/model-type-only`) 소스 없는 `export type { X }` 재export 목록 대신 별칭으로 하나씩 편다.
 */
export type ContextDescriptor = CoreContextDescriptor;
export type ContextRegistry = CoreContextRegistry;
export type KeybindingDescriptor = CoreKeybindingDescriptor;
export type KeybindingRegistry = CoreKeybindingRegistry;
export type MenuItemDescriptor = CoreMenuItemDescriptor;
export type MenuRegistry = CoreMenuRegistry;

/**
 * Shell이 갖는 "커맨드 센터" — 커맨드·컨텍스트·키바인딩·메뉴를 한데 쥔다. 탭·활동·테마를 다루는
 * `ITabsModel`·`IActivityModel`·`IThemeModel`과 성격이 달라(VSCode도 CommandService/
 * ContextKeyService/KeybindingService/MenuService를 따로 둔다) 별도 슬라이스로 뒀다.
 *
 * **옛 `CommandCenterModel`에서 분해됐다**(2026-09-05, 5-C) — 이름은 `*Model`이었지만 실제로는
 * 다른 모듈이 등록하고 View가 목록을 읽는 확장 지점 보관소였다(`IActivityBarRegistry` 등과 같은
 * 자리). `boundaries`가 이걸 예외 element(`command-registry-model`)로 빼줘야 했던 게 그 증거다 —
 * 예외 없이 표현하려면 실제로 `Registry` 역할이어야 했다. 이 폴더에 없던 유일한 atom
 * (`isPaletteOpen`/`setPaletteOpen`)은 `IShellViewModel`로 옮겼다 — 이미 `isSidebarOpen` 같은
 * 같은 성격의 shell UI 상태를 갖고 있다.
 *
 * 넷 다 `core`의 `createRegistry()`로 이 Registry가 만들고, 앱 시작 시(`registerServices.tsx`)
 * 한 번 채워진다.
 */
export const CommandCenterRegistryToken = createToken<ICommandCenterRegistry>('commandCenterRegistry');
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
