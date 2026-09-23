import { clsx } from "clsx";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import styles from "./ActivityBar.module.css";
import type { IconId } from "#component/Icon";

export interface ActivityBarItem {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
}

interface ActivityBarItemProps {
  readonly item: ActivityBarItem;
  readonly pressed?: boolean;
  readonly onClick?: (id: string) => void;
}

export const Item = ({ item, pressed, onClick }: ActivityBarItemProps) => (
  <IconButton
    variant="invisible"
    size="medium"
    aria-label={item.title}
    aria-pressed={pressed}
    className={clsx(styles["item"])}
    onClick={() => onClick?.(item.id)}
    icon={() => <Icon iconId={item.iconId} size="sm" />}
  />
);
