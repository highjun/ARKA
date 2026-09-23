import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import styles from "./Sidebar.module.css";
import { RailItem } from "./RailItem";
import type { SidebarItem } from "./RailItem";

/** 화면 낭독기가 활동 줄을 부르는 이름. 사이드바 전체(`사이드바`)와 구별된다. */
const RAIL_LABEL = "활동 막대";

export interface SidebarRailTopProps extends Omit<ComponentPropsWithoutRef<"nav">, "children"> {
  readonly ref?: Ref<HTMLElement>;
  readonly items: readonly SidebarItem[];
  readonly activeId?: string | null;
  readonly defaultActiveId?: string | null;
  readonly onItemClick?: (id: string) => void;
}

export const RailTop = ({
  items,
  activeId,
  defaultActiveId = null,
  onItemClick,
  className,
  ref,
  ...props
}: SidebarRailTopProps) => {
  const [current, setCurrent] = useControllableState<string | null>({
    prop: activeId,
    defaultProp: defaultActiveId,
    caller: "Sidebar.RailTop",
  });

  return (
    <nav
      ref={ref}
      aria-label={RAIL_LABEL}
      {...props}
      data-component="Sidebar/RailTop"
      className={clsx(className, styles["railTop"])}
    >
      {items.map((item) => (
        <RailItem
          key={item.id}
          item={item}
          pressed={item.id === current}
          onClick={(id) => {
            setCurrent(id === current ? null : id);
            onItemClick?.(id);
          }}
        />
      ))}
    </nav>
  );
};
