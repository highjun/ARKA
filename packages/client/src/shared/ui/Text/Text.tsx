import type { HTMLAttributes, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Text.module.css";

type TextSize = "small" | "medium" | "large";
type TextTone = "default" | "muted" | "danger";

export interface TextProps extends HTMLAttributes<HTMLSpanElement> {
  readonly ref?: Ref<HTMLSpanElement>;
  readonly size?: TextSize;
  readonly tone?: TextTone;
}

export const Text = ({ size = "medium", tone = "default", className, ref, ...props }: TextProps) => (
  <span
    ref={ref}
    {...props}
    data-text-size={size}
    data-text-tone={tone}
    data-component="Text"
    className={clsx(className, styles["Text"])}
  />
);
