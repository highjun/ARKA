import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./Sidebar.module.css";

/** 확장의 사이드바 내용이 서는 자리. */
export interface SidebarBodyProps extends ComponentPropsWithoutRef<"div"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * 머리 아래 남는 자리를 다 먹는다. **넘치는 것을 받아 내지는 않는다** — 스크롤이 필요하면
 * 안에 `Container`를 둔다. 그릇이 스크롤 정책까지 정하면 그것이 싫은 내용이 빠져나갈 수 없다.
 */
export const SidebarBody = ({ className, children, ref, ...props }: SidebarBodyProps) => (
  <div ref={ref} {...props} data-component="Sidebar/Body" className={clsx(className, styles["body"])}>
    {children}
  </div>
);
