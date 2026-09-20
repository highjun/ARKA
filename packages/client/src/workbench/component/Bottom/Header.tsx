import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Icon } from "#component/Icon";
import type { IconId } from "#component/Icon";
import styles from "./Bottom.module.css";

export interface BottomTab {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
  readonly isActive: boolean;
}

export interface BottomHeaderProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly tabs: readonly BottomTab[];
  readonly actions?: ReactNode;
  readonly onSelect?: (id: string) => void;
}

export const BottomHeader = ({ tabs, actions, onSelect, className, ref, ...props }: BottomHeaderProps) => (
  <div
    ref={ref}
    role="tablist"
    aria-orientation="horizontal"
    {...props}
    data-component="Bottom/Header"
    className={clsx(className, styles["header"])}
  >
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={tab.isActive}
        data-active={tab.isActive ? "" : undefined}
        className={styles["tab"]}
        onClick={() => onSelect?.(tab.id)}
      >
        <Icon iconId={tab.iconId} size="sm" />
        {tab.title}
      </button>
    ))}
    {actions === undefined ? null : <div className={styles["actions"]}>{actions}</div>}
  </div>
);
