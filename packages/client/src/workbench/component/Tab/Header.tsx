import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import type { TabRow } from "./shared";
import { useTabClassNames } from "./TabContext";

export interface TabHeaderProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title" | "onSelect"> {
  readonly tab: TabRow;
  readonly isActive?: boolean;
  readonly onSelect?: () => void;
  readonly onClose?: () => void;
}

const handleHeaderCloseClick = (onClose: () => void) => (event: { stopPropagation: () => void }) => {
  event.stopPropagation();
  onClose();
};

const preventDragStart = (event: { preventDefault: () => void }) => event.preventDefault();

export const TabHeader = ({
  tab,
  isActive = false,
  onSelect,
  onClose,
  onKeyDown,
  className,
  ...props
}: TabHeaderProps) => {
  const classNames = useTabClassNames();
  const handleKeyDown: TabHeaderProps["onKeyDown"] = (event) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onSelect?.();
    }
  };
  const closeButton = (pinned: boolean) =>
    onClose === undefined ? null : (
      <IconButton
        variant="invisible"
        size="small"
        aria-label={`${tab.title} 닫기`}
        draggable={false}
        className={pinned ? classNames.headerCloseButtonPinned : classNames.headerCloseButtonHover}
        onClick={handleHeaderCloseClick(onClose)}
        onDragStart={preventDragStart}
        icon={() => <Icon iconId="close" size="sm" />}
      />
    );

  return (
    <div
      {...props}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role={props.role ?? "tab"}
      aria-selected={props["aria-selected"] ?? isActive}
      data-active={isActive ? "" : undefined}
      data-dirty={tab.isDirty ? "" : undefined}
      data-component="Tab.Header"
      className={clsx(className, classNames.header)}
    >
      <span className={classNames.headerIcon}>{tab.icon}</span>
      <span data-preview={tab.isPreview ? "" : undefined} className={classNames.headerLabel}>
        {tab.title}
      </span>
      {isActive ? <span className={classNames.headerActionSlot}>{closeButton(true)}</span> : closeButton(false)}
    </div>
  );
};
