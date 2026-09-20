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
}

interface ItemsProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly items: readonly SidebarRow[];
  readonly onSelect?: (id: string) => void;
  readonly renderItemMenu?: (item: SidebarRow) => ReactNode;
}

interface ActivityBarTopProps extends ItemsProps {
  readonly activeId?: string | null;
}

type ActivityBarBottomProps = ItemsProps;

export interface ActivityBarRootProps extends ComponentPropsWithoutRef<"nav"> {
  readonly ref?: Ref<HTMLElement>;
}

const 줄 = (item: SidebarRow, isActive: boolean, props: ItemsProps) => {
  const button = (
    <IconButton
      key={item.id}
      variant={isActive ? "default" : "invisible"}
      size="medium"
      aria-label={item.title}
      aria-pressed={isActive}
      onClick={() => props.onSelect?.(item.id)}
      icon={() => <Icon iconId={item.iconId} size="lg" />}
    />
  );

  return props.renderItemMenu ? (
    <Menu kind="context" key={item.id}>
      <Menu.Trigger className={styles["itemContextMenuTrigger"]}>{button}</Menu.Trigger>
      <Menu.Content>{props.renderItemMenu(item)}</Menu.Content>
    </Menu>
  ) : (
    button
  );
};

const ActivityBarTop = ({
  items,
  activeId,
  onSelect,
  renderItemMenu,
  className,
  ref,
  ...props
}: ActivityBarTopProps) => (
  <Container chrome="none" className={clsx(className, styles["container"])}>
    <div ref={ref} {...props} data-component="ActivityBar/Top" className={styles["rail"]}>
      {items.map((item) => 줄(item, item.id === activeId, { items, onSelect, renderItemMenu }))}
    </div>
  </Container>
);

const ActivityBarBottom = ({ items, onSelect, renderItemMenu, className, ref, ...props }: ActivityBarBottomProps) => (
  <div ref={ref} {...props} data-component="ActivityBar/Bottom" className={clsx(className, styles["bottom"])}>
    {items.map((item) => 줄(item, false, { items, onSelect, renderItemMenu }))}
  </div>
);

const ActivityBarRoot = ({ children, className, ref, ...props }: ActivityBarRootProps) => (
  <nav ref={ref} {...props} data-component="ActivityBar" className={clsx(className, styles["nav"])}>
    {children}
  </nav>
);

export const ActivityBar = Object.assign(ActivityBarRoot, { Top: ActivityBarTop, Bottom: ActivityBarBottom });
