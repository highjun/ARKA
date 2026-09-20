import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { SidebarBody } from "./Body";
import { SidebarHeader } from "./Header";
import styles from "./Sidebar.module.css";

type SidebarDensity = "comfortable" | "compact";

export interface SidebarRootProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly density?: SidebarDensity;
  readonly ref?: Ref<HTMLDivElement>;
  readonly children?: ReactNode;
}

const SidebarRoot = ({ density = "comfortable", className, children, ref, ...props }: SidebarRootProps) => (
  <div ref={ref} {...props} data-density={density} data-component="Sidebar" className={clsx(className, styles["root"])}>
    {children}
  </div>
);

export const Sidebar = Object.assign(SidebarRoot, { Header: SidebarHeader, Body: SidebarBody });
