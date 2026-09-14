import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, KeyboardEvent } from "react";
import styles from "./Item.module.css";
import { CounterLabel } from "@primer/react";
import { StatusIndicator } from "../StatusIndicator";
import type { StatusIndicatorStatus } from "../StatusIndicator";
import { Timestamp } from "#component/Timestamp";

/** 고를 수 있는지와 고르면 무엇을 하는지 — 행의 상호작용만 묶은 것이다. */
export interface SessionListItemSelection {
  readonly isActive?: boolean;
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
}

const MAX_VISIBLE_UNREAD = 99;

/**
 * 순수 계산이라 훅이 필요 없다 — `unread` 하나로만 정해진다. Primer의 `CounterLabel`은 "99+" 같은
 * 캡핑을 안 해주므로(children을 그대로 보여줄 뿐) 이 계산은 여기서 갖는다. 유일한 소비처가
 * 이 컴포넌트 하나뿐이라 별도 래퍼 컴포넌트를 두지 않는다.
 */
const formatUnread = (unread: number): string | null => {
  const safeCount = Math.max(0, Math.floor(unread));
  if (safeCount <= 0) return null;
  return safeCount > MAX_VISIBLE_UNREAD ? `${MAX_VISIBLE_UNREAD}+` : String(safeCount);
};

/**
 * 순수 함수라 훅이 필요 없다 — `cva()`처럼 값(이 경우 이벤트 핸들러가 든 props 객체)을 계산해서
 * 반환할 뿐이고, JSX 속성에는 이 반환값을 그대로 스프레드한다(인라인 함수 리터럴이 아니다).
 */
const getInteractiveProps = ({ isActive = false, disabled = false, onSelect }: SessionListItemSelection) => {
  const select = () => {
    if (disabled) return;
    onSelect?.();
  };

  return {
    role: "option" as const,
    "aria-selected": isActive,
    "aria-disabled": disabled || undefined,
    tabIndex: disabled ? -1 : isActive ? 0 : -1,
    onClick: select,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      select();
    },
  };
};

/** `title`을 가로챈다 — 네이티브 툴팁이 아니라 세션 제목이다. */
export interface SessionListItemProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title" | "onSelect"> {
  /** 세션 제목 — 목록의 첫 줄이자 `aria-label`로 그대로 쓰인다. */
  readonly title: string;
  /** 마지막 메시지 등 미리보기 한 줄. 없으면 빈 자리로 남는다. */
  readonly excerpt?: string;
  /** 세션 진행 상태 — `StatusIndicator`로 그대로 위임한다. 기본값 `'done'`. */
  readonly status?: StatusIndicatorStatus;
  /** 마지막 활동 시각(epoch ms). 없으면 타임스탬프 자리를 표시하지 않는다. */
  readonly timestamp?: number;
  /** 안읽음 개수. 0 이하거나 없으면 배지를 숨기고, `MAX_VISIBLE_UNREAD`(99)를 넘으면 "99+"로 캡핑한다. */
  readonly unread?: number | null;
  /** 현재 선택된 행인지 — 강조 스타일과 `aria-selected`에 반영된다. */
  readonly isActive?: boolean;
  /** 비활성 여부. true면 클릭·키보드 선택이 무시되고 탭 순서에서 빠진다. */
  readonly disabled?: boolean;
  /** 선택(클릭 또는 Enter/Space) 시 호출된다. `disabled`면 호출되지 않는다. */
  readonly onSelect?: () => void;
}

/** 세션 목록의 행 하나 — 제목·미리보기·시각·안 읽은 수를 담고 클릭과 Enter/Space로 선택된다. */
export const SessionListItem = ({
  title,
  excerpt,
  status = "done",
  timestamp,
  unread,
  isActive = false,
  disabled = false,
  onSelect,
  className,
  ...props
}: SessionListItemProps) => {
  const unreadText = formatUnread(unread ?? 0);
  return (
    <div
      {...props}
      {...getInteractiveProps({ isActive, disabled, onSelect })}
      aria-label={title}
      data-active={isActive}
      data-disabled={disabled}
      data-component="SessionList.Item"
      className={clsx(className, styles["root"])}
    >
      <div className={styles["headerRow"]}>
        <div className={styles["title"]}>{title}</div>
        <div className={styles["badges"]}>
          {unreadText === null ? null : <CounterLabel variant="primary">{unreadText}</CounterLabel>}
          <StatusIndicator status={status} />
        </div>
      </div>
      <div className={styles["metaRow"]}>
        <div className={styles["excerpt"]}>{excerpt}</div>
        {timestamp ? (
          <div className={styles["timestamp"]}>
            <Timestamp epoch={timestamp} mode="relative" />
          </div>
        ) : null}
      </div>
    </div>
  );
};
