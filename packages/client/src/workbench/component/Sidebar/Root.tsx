import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Sidebar.module.css";

export interface SidebarRootProps extends ComponentPropsWithoutRef<"div"> {
  readonly ref?: Ref<HTMLDivElement>;
}

export const Root = ({ children, className, ref, ...props }: SidebarRootProps) => (
  <div ref={ref} {...props} data-component="Sidebar" className={clsx(className, styles["root"])}>
    {children}
  </div>
);
