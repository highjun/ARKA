import { useViewModel } from "#core/viewmodel";
import { Menu } from "#component/Menu";
import type { ReactNode } from "react";

/**
 * `menuId`로 담긴 `MenuItem`을 찾아 그 명령들을 우클릭 메뉴로 그린다. 무엇이 담겼는지는 몰라도 된다 —
 * `ICommandService`가 `menuId` 문자열로만 잇는다.
 *
 * `context`는 각 명령의 `execute(context)`로 그대로 전달된다 — 파일 트리라면 우클릭된 항목이다.
 *
 * `useViewModel` 하나만 부른다 — `onSelect`는 매 렌더 새로 계산되는 값이라 메모이즈할 이유가 없다.
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
  const commands = useViewModel("arka.commands");

  const items = commands
    .matchMenuItems(menuId)
    .map((menuItem) => {
      const action = commands.actions.tryGet(menuItem.actionId);
      return action === undefined ? null : { actionId: menuItem.actionId, label: action.label };
    })
    .filter((item) => item !== null);

  return (
    <Menu kind="context" onOpenChange={onOpenChange}>
      <Menu.Trigger>{children}</Menu.Trigger>
      {items.length === 0 ? null : (
        <Menu.Content>
          {items.map((item) => (
            <Menu.Item key={item.actionId} onSelect={() => commands.execute(item.actionId, context)}>
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      )}
    </Menu>
  );
};
