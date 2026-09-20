import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./Bottom.module.css";

export interface BottomPanelProps extends ComponentPropsWithoutRef<"div"> {
  readonly ref?: Ref<HTMLDivElement>;
}

export const BottomPanel = ({ className, children, ref, ...props }: BottomPanelProps) => (
  <div ref={ref} role="tabpanel" {...props} data-component="Bottom/Panel" className={clsx(className, styles["panel"])}>
    {children}
  </div>
);
