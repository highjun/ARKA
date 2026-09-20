import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./CommandCenter.module.css";

export interface CommandCenterProps extends Omit<ComponentPropsWithoutRef<"button">, "children" | "value"> {
  readonly ref?: Ref<HTMLButtonElement>;
  readonly value: string;
}

export const CommandCenter = ({ value, className, ref, ...props }: CommandCenterProps) => (
  <button
    ref={ref}
    type="button"
    aria-label="명령 팔레트 열기"
    {...props}
    data-component="CommandCenter"
    className={clsx(className, styles["root"])}
  >
    {value}
  </button>
);
