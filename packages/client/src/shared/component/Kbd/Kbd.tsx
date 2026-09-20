import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Kbd.module.css";

type KbdTone = "default" | "onEmphasis";

export interface KbdProps extends ComponentPropsWithoutRef<"kbd"> {
  readonly ref?: Ref<HTMLElement>;
  readonly tone?: KbdTone;
}

export const Kbd = ({ tone = "default", className, ref, ...props }: KbdProps) => (
  <kbd ref={ref} {...props} data-component="Kbd" data-tone={tone} className={clsx(className, styles["root"])} />
);
