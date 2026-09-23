import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { Icon } from "#component/Icon";
import { Kbd, keysOf } from "#component/Kbd";
import styles from "./CommandPalette.module.css";

const PLACEHOLDER = "커맨드 검색...";

export interface CommandPaletteTriggerProps extends Omit<ComponentPropsWithoutRef<"button">, "children" | "value"> {
  readonly ref?: Ref<HTMLButtonElement>;
  readonly placeholder?: string;
  readonly keybinding?: string;
}

export const CommandPaletteTrigger = ({
  placeholder = PLACEHOLDER,
  keybinding = "",
  className,
  ref,
  ...props
}: CommandPaletteTriggerProps) => {
  const keys = keysOf(keybinding);

  return (
    <button
      ref={ref}
      type="button"
      aria-label="명령 팔레트 열기"
      {...props}
      data-component="CommandPalette/Trigger"
      className={clsx(className, styles["trigger"])}
    >
      <Icon iconId="search" size="sm" />
      <span className={styles["triggerPlaceholder"]}>{placeholder}</span>
      {keys.length > 0 && (
        <span className={styles["shortcuts"]}>
          {keys.map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </span>
      )}
    </button>
  );
};
