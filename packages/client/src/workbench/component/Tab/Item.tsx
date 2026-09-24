import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import { Icon } from "#ui/Icon";
import { IconButton } from "#ui/IconButton";
import styles from "./Tab.module.css";
import type { TabItem } from "./shared";

export interface TabItemProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly item: TabItem;
  readonly isActive?: boolean;
  readonly onItemSelect?: () => void;
  /** 없으면 닫기 버튼을 안 그린다. */
  readonly onItemClose?: () => void;
}

const stopAnd = (run: () => void) => (event: { stopPropagation: () => void }) => {
  event.stopPropagation();
  run();
};

const preventDragStart = (event: { preventDefault: () => void }) => event.preventDefault();

export const Item = ({
  item,
  isActive = false,
  onItemSelect,
  onItemClose,
  onKeyDown,
  className,
  ref,
  ...props
}: TabItemProps) => {
  const handleKeyDown: TabItemProps["onKeyDown"] = (event) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onItemSelect?.();
    }
  };

  const closeButton =
    onItemClose === undefined ? null : (
      <IconButton
        variant="invisible"
        size="small"
        aria-label={`${item.title} 닫기`}
        draggable={false}
        className={styles["itemCloseButton"]}
        onClick={stopAnd(onItemClose)}
        onDragStart={preventDragStart}
        icon={() => <Icon iconId="close" size="sm" />}
      />
    );

  return (
    <div
      ref={ref}
      {...props}
      onClick={onItemSelect}
      onKeyDown={handleKeyDown}
      role={props.role ?? "tab"}
      aria-selected={props["aria-selected"] ?? isActive}
      data-active={isActive ? "" : undefined}
      data-dirty={item.isDirty ? "" : undefined}
      data-component="Tab/Item"
      className={clsx(className, styles["item"])}
    >
      <span className={styles["itemIcon"]}>{item.icon}</span>
      <span data-preview={item.isPreview ? "" : undefined} className={styles["itemLabel"]}>
        {item.title}
      </span>
      {closeButton === null && item.isDirty !== true ? null : (
        <span className={styles["itemClose"]}>
          {closeButton}
          {/* 저장 안 한 표시. 닫기 표 위에 겹쳐 두고, 손이 올라오면 자리를 내준다. */}
          {item.isDirty ? <span aria-hidden="true" className={styles["itemDirtyDot"]} /> : null}
        </span>
      )}
    </div>
  );
};
