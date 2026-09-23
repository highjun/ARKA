import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Sidebar.module.css";

export interface SidebarPanelProps extends Omit<ComponentPropsWithoutRef<"div">, "title" | "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  /** 제목 줄. 없으면 줄 자체를 안 그린다 — 본문이 위까지 올라온다. */
  readonly title?: ReactNode;
  /** 지금 보이는 본문. 바뀌면 이전 것은 사라진다 — 지킬 상태는 ViewModel 에 둔다. */
  readonly body?: ReactNode;
}

export const Panel = ({ title, body, className, ref, ...props }: SidebarPanelProps) => (
  <div ref={ref} {...props} data-component="Sidebar/Panel" className={clsx(className, styles["panel"])}>
    {title === undefined ? null : (
      <header className={styles["panelHeader"]}>
        <div className={styles["panelTitle"]}>{title}</div>
      </header>
    )}
    <div className={styles["panelBody"]}>{body}</div>
  </div>
);
