import { matchMenuItems } from "#core/menu";
import { useViewModel } from "#core/viewmodel";
import { Menu } from "#component/Menu";
import type { ReactNode } from "react";

/**
 * 다른 모듈이 자기 컨텍스트 메뉴를 갖고 싶을 때 쓰는 자리 — `menuId`로 등록된 `MenuItemDescriptor`를
 * 찾아 그 커맨드들을 메뉴로 그린다. 이 모듈(그리고 이 컴포넌트를 쓰는 모듈)은 무엇이 등록됐는지
 * 몰라도 된다 — Registry가 `id` 문자열로만 잇는다.
 *
 * `context`는 각 커맨드의 `execute(context)`로 그대로 전달된다 — 예를 들어 파일 트리의 우클릭
 * 메뉴라면 `context`가 우클릭된 항목(경로·종류)이 된다.
 *
 * `useViewModel` 하나만 부른다 — `onSelect`는 매 렌더 새로 계산되는 값이라 메모이즈할 이유가 없다
 * (`useCallback`로 감싸지 않는다, `view-only-uses-view-model`).
 */
export const CommandContextMenu = ({
  menuId,
  context,
  onOpenChange,
  children,
}: {
  readonly menuId: string;
  readonly context?: unknown;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children: ReactNode;
}) => {
  const commandCenterRegistry = useViewModel("arka.commands");

  const items = matchMenuItems(commandCenterRegistry.menuRegistry, commandCenterRegistry.contextRegistry, menuId)
    .map((menuItem) => {
      const command = commandCenterRegistry.commandRegistry.tryGet(menuItem.commandId);
      return command === undefined ? null : { id: menuItem.id, label: command.label, commandId: menuItem.commandId };
    })
    .filter((item) => item !== null);

  const onSelect = (id: string): void => {
    const commandId = items.find((item) => item.id === id)?.commandId;
    if (commandId !== undefined) commandCenterRegistry.commandRegistry.tryGet(commandId)?.execute(context);
  };

  return (
    <Menu kind="context" onOpenChange={onOpenChange}>
      <Menu.Trigger>{children}</Menu.Trigger>
      {items.length === 0 ? null : (
        <Menu.Content>
          {items.map((item) => (
            <Menu.Item key={item.id} onSelect={() => onSelect(item.id)}>
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      )}
    </Menu>
  );
};
