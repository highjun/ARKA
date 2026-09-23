import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import styles from "./ActivityBar.module.css";
import { Item } from "./Item";
import type { ActivityBarItem } from "./Item";

export interface ActivityBarTopProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly items: readonly ActivityBarItem[];
  readonly activeId?: string | null;
  readonly defaultActiveId?: string | null;
  readonly onItemClick?: (id: string) => void;
}

export const Top = ({
  items,
  activeId,
  defaultActiveId = null,
  onItemClick,
  className,
  ref,
  ...props
}: ActivityBarTopProps) => {
  const [current, setCurrent] = useControllableState<string | null>({
    prop: activeId,
    defaultProp: defaultActiveId,
    caller: "ActivityBar.Top",
  });

  return (
    <div
      ref={ref}
      {...props}
      data-component="ActivityBar/Top"
      className={clsx(className, styles["group"], styles["scroll"])}
    >
      {items.map((item) => (
        <Item
          key={item.id}
          item={item}
          pressed={item.id === current}
          onClick={(id) => {
            setCurrent(id === current ? null : id);
            onItemClick?.(id);
          }}
        />
      ))}
    </div>
  );
};
