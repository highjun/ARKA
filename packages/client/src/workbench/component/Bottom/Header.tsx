import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Icon } from "#component/Icon";
import type { IconId } from "#component/Icon";
import styles from "./Bottom.module.css";

/**
 * 아래 창 하나를 가리키는 줄. **활성을 줄이 든다** — 레일의 `SidebarRow`와 다르다.
 * 아래 창은 같은 것을 다시 눌러 닫을 수 있어 「지금 어느 것」이 아니라 「이것이 열렸나」가 값이다.
 */
export interface BottomTab {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
  readonly isActive: boolean;
}

/** `children`을 막는다 — 줄은 `tabs`가 만들고, 오른쪽에 놓을 것만 `actions`로 받는다. */
export interface BottomHeaderProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 열 수 있는 아래 창들. 빈 배열이면 줄이 안 선다. */
  readonly tabs: readonly BottomTab[];
  /** 띠 오른쪽에 놓을 것 — 더하기·키우기·넘침·닫기. 없으면 자리도 없다. */
  readonly actions?: ReactNode;
  /** 줄을 누를 때. **같은 것을 다시 누르면 닫는 것**은 받는 쪽이 정한다. */
  readonly onSelect?: (id: string) => void;
}

/**
 * 아래 창들의 탭 줄. 밑줄로 지금 자리를 알린다 — 배경과 닫기 단추가 있는 편집기 탭과 다르다.
 *
 * `role="tablist"`다. Primer `UnderlineNav`는 `nav` 시맨틱이라 여기 안 쓴다 — 아래 창은
 * 어디로 가는 것이 아니라 한 자리에서 무엇을 볼지 고르는 것이다.
 */
export const BottomHeader = ({ tabs, actions, onSelect, className, ref, ...props }: BottomHeaderProps) => (
  <div
    ref={ref}
    role="tablist"
    aria-orientation="horizontal"
    {...props}
    data-component="Bottom/Header"
    className={clsx(className, styles["header"])}
  >
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={tab.isActive}
        data-active={tab.isActive ? "" : undefined}
        className={styles["tab"]}
        onClick={() => onSelect?.(tab.id)}
      >
        <Icon iconId={tab.iconId} size="sm" />
        {tab.title}
      </button>
    ))}
    {actions === undefined ? null : <div className={styles["actions"]}>{actions}</div>}
  </div>
);
