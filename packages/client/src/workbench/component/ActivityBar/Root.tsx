import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./ActivityBar.module.css";

const NAV_LABEL = "활동 막대";

export interface ActivityBarRootProps extends ComponentPropsWithoutRef<"nav"> {
  readonly ref?: Ref<HTMLElement>;
}

export const Root = ({ children, className, ref, ...props }: ActivityBarRootProps) => (
  <nav
    ref={ref}
    aria-label={NAV_LABEL}
    {...props}
    data-component="ActivityBar"
    className={clsx(className, styles["nav"])}
  >
    {children}
  </nav>
);
