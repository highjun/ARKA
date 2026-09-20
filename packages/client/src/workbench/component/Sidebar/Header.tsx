import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./Sidebar.module.css";

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

/** `children`을 막는다 — 자리가 제목과 액션 둘로 정해져 있어 아무 자식이나 받지 않는다. */
export interface SidebarHeaderProps extends Omit<ComponentPropsWithoutRef<"header">, "title" | "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 머리 왼쪽 — 아이콘 접두어 등을 조합할 수 있도록 문자열이 아니라 `ReactNode`다. */
  readonly title?: ReactNode;
  /** 머리 오른쪽에 놓을 액션(버튼·`Menu` 등) — 어떤 조합이든 소비처가 직접 조립해 넘긴다. */
  readonly actions?: ReactNode;
}

/**
 * 사이드바의 머리. **`title`·`actions`가 둘 다 없으면 아무것도 그리지 않는다** — 빈 줄이
 * 자리를 차지하면 본문이 그만큼 밀린다.
 *
 * 크기는 루트의 `data-density`가 고른다. 이 부품은 그 값을 모른다.
 */
export const SidebarHeader = ({ title, actions, className, ref, ...props }: SidebarHeaderProps) => {
  if (title === undefined && !hasContent(actions)) return null;

  return (
    <header ref={ref} {...props} data-component="Sidebar/Header" className={clsx(className, styles["header"])}>
      <div className={styles["title"]}>{title}</div>
      {hasContent(actions) ? <div className={styles["actions"]}>{actions}</div> : null}
    </header>
  );
};
