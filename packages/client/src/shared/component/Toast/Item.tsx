import { clsx } from "clsx";
import { useEffect } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import styles from "./Toast.module.css";

type ToastSeverity = "info" | "warning" | "error";

const GLYPH = { info: "bell", warning: "warning", error: "error" } as const;

export interface ToastItemProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly severity: ToastSeverity;
  readonly message: string;
  readonly action?: ReactNode;
  readonly timeout?: number;
  readonly onDismiss?: () => void;
  readonly onTimeout?: () => void;
}

export const ToastItem = ({
  severity,
  message,
  action,
  timeout,
  onDismiss,
  onTimeout,
  className,
  ref,
  ...props
}: ToastItemProps) => {
  useEffect(() => {
    if (timeout === undefined) return undefined;
    const id = setTimeout(() => (onTimeout ?? onDismiss)?.(), timeout);
    return () => clearTimeout(id);
  }, [timeout, onTimeout, onDismiss]);

  return (
    <div
      ref={ref}
      role="status"
      {...props}
      data-severity={severity}
      data-component="Toast/Item"
      className={clsx(className, styles["item"])}
    >
      <span className={styles["line"]}>
        <Icon iconId={GLYPH[severity]} size="sm" className={styles["glyph"]} />
        <span className={styles["message"]}>{message}</span>
        <IconButton
          variant="invisible"
          size="small"
          aria-label="닫기"
          onClick={() => onDismiss?.()}
          icon={() => <Icon iconId="close" size="sm" />}
        />
      </span>
      {action === undefined ? null : <span className={styles["actions"]}>{action}</span>}
    </div>
  );
};
