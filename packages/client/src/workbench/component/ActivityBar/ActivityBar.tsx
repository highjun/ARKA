import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import styles from "./ActivityBar.module.css";
import { Container } from "#component/Container";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Menu } from "#component/Menu";
import type { IconId } from "#component/Icon";

export interface SidebarRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
  readonly isActive: boolean;
}

export interface ActivityBarProps extends Omit<ComponentPropsWithoutRef<"nav">, "onSelect"> {
  readonly ref?: Ref<HTMLElement>;
  readonly items: readonly SidebarRow[];
  readonly onSelect?: (id: string) => void;
  readonly renderItemMenu?: (item: SidebarRow) => ReactNode;
  readonly onSettingsSelect?: () => void;
}

export const ActivityBar = ({
  items,
  onSelect,
  renderItemMenu,
  onSettingsSelect,
  className,
  ref,
  ...props
}: ActivityBarProps) => (
  <nav ref={ref} {...props} data-component="ActivityBar" className={clsx(className, styles["nav"])}>
    <Container chrome="none" className={styles["container"]}>
      <div className={styles["rail"]}>
        {items.map((item) => {
          const button = (
            <IconButton
              key={item.id}
              variant={item.isActive ? "default" : "invisible"}
              size="medium"
              aria-label={item.title}
              aria-pressed={item.isActive}
              onClick={() => onSelect?.(item.id)}
              icon={() => <Icon iconId={item.iconId} size="lg" />}
            />
          );

          return renderItemMenu ? (
            <Menu kind="context" key={item.id}>
              <Menu.Trigger className={styles["itemContextMenuTrigger"]}>{button}</Menu.Trigger>
              <Menu.Content>{renderItemMenu(item)}</Menu.Content>
            </Menu>
          ) : (
            button
          );
        })}
      </div>
    </Container>
    <div className={styles["footer"]}>
      <IconButton
        variant="invisible"
        size="medium"
        aria-label="설정"
        onClick={onSettingsSelect}
        icon={() => <Icon iconId="settingsGear" size="lg" />}
      />
    </div>
  </nav>
);
