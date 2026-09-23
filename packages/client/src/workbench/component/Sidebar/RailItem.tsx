import { clsx } from "clsx";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import styles from "./Sidebar.module.css";
import type { IconId } from "#component/Icon";

export interface SidebarItem {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
}

/** 밖에서 한 칸만 따로 그릴 일이 없어 내보내지 않는다 — 줄(`RailTop`·`RailBottom`)이 채운다. */
interface SidebarRailItemProps {
  readonly item: SidebarItem;
  readonly pressed?: boolean;
  readonly onClick?: (id: string) => void;
}

export const RailItem = ({ item, pressed, onClick }: SidebarRailItemProps) => (
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
