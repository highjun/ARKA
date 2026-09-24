import { clsx } from "clsx";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Icon } from "#ui/Icon";
import { IconButton } from "#ui/IconButton";
import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./Bottom.module.css";

export interface BottomItem {
  readonly id: string;
  readonly title: string;
}

export interface BottomHeaderProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly items: readonly BottomItem[];
  readonly activeId?: string | null;
  readonly defaultActiveId?: string | null;
  readonly onItemSelect?: (id: string) => void;
  /** 없으면 닫기 단추 자체를 안 그린다 — 창을 접는 건 바깥이 맡는다. */
  readonly onClose?: () => void;
}

export const BottomHeader = ({
  items,
  activeId,
  defaultActiveId = null,
  onItemSelect,
  onClose,
  className,
  ref,
  ...props
}: BottomHeaderProps) => {
  const [current, setCurrent] = useControllableState<string | null>({
    prop: activeId,
    defaultProp: defaultActiveId,
    caller: "Bottom.Header",
  });

  return (
    <div
      ref={ref}
      role="tablist"
      aria-orientation="horizontal"
      {...props}
      data-component="Bottom/Header"
      className={clsx(className, styles["header"])}
    >
      {items.map((item) => {
        const isActive = item.id === current;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-active={isActive ? "" : undefined}
            className={styles["tab"]}
            onClick={() => {
              setCurrent(item.id);
              onItemSelect?.(item.id);
            }}
          >
            {item.title}
          </button>
        );
      })}
      {onClose === undefined ? null : (
        <IconButton
          variant="invisible"
          size="small"
          aria-label="아래 창 닫기"
          className={styles["close"]}
          onClick={() => onClose()}
          icon={() => <Icon iconId="close" size="sm" />}
        />
      )}
    </div>
  );
};
