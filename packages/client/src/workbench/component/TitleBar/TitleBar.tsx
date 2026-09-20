import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./TitleBar.module.css";

export interface TitleBarProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly brand?: ReactNode;
  readonly center?: ReactNode;
  readonly actions?: ReactNode;
}

export const TitleBar = ({ brand, center, actions, className, ref, ...props }: TitleBarProps) => (
  <div ref={ref} {...props} data-component="TitleBar" className={clsx(className, styles["root"])}>
    <span className={styles["group"]}>{brand}</span>
    <span className={styles["center"]}>{center}</span>
    <span className={clsx(styles["group"], styles["trailing"])}>{actions}</span>
  </div>
);
