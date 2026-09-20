import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Menu } from "#component/Menu";
import type { ReactNode } from "react";

export const CommandContextMenu = observer(function CommandContextMenu({
  menuId,
  context,
  onOpenChange,
  children,
}: {
  readonly menuId: string;
  readonly context?: unknown;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children: ReactNode;
}) {
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
});
