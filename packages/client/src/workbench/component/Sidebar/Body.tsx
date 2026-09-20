import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./Sidebar.module.css";

export interface SidebarBodyProps extends ComponentPropsWithoutRef<"div"> {
  readonly ref?: Ref<HTMLDivElement>;
}

export const SidebarBody = ({ className, children, ref, ...props }: SidebarBodyProps) => (
  <div ref={ref} {...props} data-component="Sidebar/Body" className={clsx(className, styles["body"])}>
    {children}
  </div>
);
