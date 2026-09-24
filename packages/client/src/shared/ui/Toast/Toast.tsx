import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { ToastItem } from "./Item";
import styles from "./Toast.module.css";

type ToastPlacement = "bottom-right" | "bottom-left";

export interface ToastRootProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly placement?: ToastPlacement;
  readonly children?: ReactNode;
}

const ToastRoot = ({ placement = "bottom-right", className, children, ref, ...props }: ToastRootProps) => (
  <div
    ref={ref}
    aria-live="polite"
    {...props}
    data-placement={placement}
    data-component="Toast"
    className={clsx(className, styles["root"])}
  >
    {children}
  </div>
);

export const Toast = Object.assign(ToastRoot, { Item: ToastItem });
