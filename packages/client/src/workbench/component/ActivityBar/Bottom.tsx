import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./ActivityBar.module.css";
import { Item } from "./Item";
import type { ActivityBarItem } from "./Item";

export interface ActivityBarBottomProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly items: readonly ActivityBarItem[];
  readonly onItemClick?: (id: string) => void;
}

export const Bottom = ({ items, onItemClick, className, ref, ...props }: ActivityBarBottomProps) => (
  <div ref={ref} {...props} data-component="ActivityBar/Bottom" className={clsx(className, styles["group"])}>
    {items.map((item) => (
      <Item key={item.id} item={item} onClick={onItemClick} />
    ))}
  </div>
);
