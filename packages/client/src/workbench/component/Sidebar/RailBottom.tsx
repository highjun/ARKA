import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Sidebar.module.css";
import { RailItem } from "./RailItem";
import type { SidebarItem } from "./RailItem";

export interface SidebarRailBottomProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly items: readonly SidebarItem[];
  readonly onItemClick?: (id: string) => void;
}

/** 눌린 상태가 없다 — 여기 칸은 패널을 여는 대신 그 자리에서 일을 한다(설정 등). */
export const RailBottom = ({ items, onItemClick, className, ref, ...props }: SidebarRailBottomProps) => (
  <div ref={ref} {...props} data-component="Sidebar/RailBottom" className={clsx(className, styles["railBottom"])}>
    {items.map((item) => (
      <RailItem key={item.id} item={item} onClick={onItemClick} />
    ))}
  </div>
);
