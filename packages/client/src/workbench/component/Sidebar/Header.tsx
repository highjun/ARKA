import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./Sidebar.module.css";

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

export interface SidebarHeaderProps extends Omit<ComponentPropsWithoutRef<"header">, "title" | "children"> {
  readonly ref?: Ref<HTMLElement>;
  readonly title?: ReactNode;
  readonly actions?: ReactNode;
}

export const SidebarHeader = ({ title, actions, className, ref, ...props }: SidebarHeaderProps) => {
  if (title === undefined && !hasContent(actions)) return null;

  return (
    <header ref={ref} {...props} data-component="Sidebar/Header" className={clsx(className, styles["header"])}>
      <div className={styles["title"]}>{title}</div>
      {hasContent(actions) ? <div className={styles["actions"]}>{actions}</div> : null}
    </header>
  );
};
