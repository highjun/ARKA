import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./Panel.module.css";

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

type PanelDensity = "comfortable" | "compact";

export interface PanelProps extends Omit<ComponentPropsWithoutRef<"div">, "title" | "children"> {
  readonly density?: PanelDensity;
  readonly ref?: Ref<HTMLDivElement>;
  readonly title?: ReactNode;
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
}

export const Panel = ({ title, actions, children, density = "comfortable", className, ref, ...props }: PanelProps) => {
  const hasHeader = title !== undefined || hasContent(actions);

  return (
    <div ref={ref} {...props} data-density={density} data-component="Panel" className={clsx(className, styles["root"])}>
      {hasHeader ? (
        <header className={styles["header"]}>
          <div className={styles["title"]}>{title}</div>
          {hasContent(actions) ? <div className={styles["actions"]}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={styles["body"]}>{children}</div>
    </div>
  );
};
