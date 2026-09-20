import { clsx } from "clsx";
import { useEffect } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import styles from "./Toast.module.css";

/** 알림의 무게. `INotifications`의 것과 같은 낱말이다. */
type ToastSeverity = "info" | "warning" | "error";

/** 무게마다 글리프가 다르다 — 색은 CSS가 `data-severity`로 고른다. */
const GLYPH = { info: "bell", warning: "warning", error: "error" } as const;

/** `children`을 막는다 — 적히는 것은 `message` 하나다. */
export interface ToastItemProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 알림의 무게. 아이콘 색이 이것으로 갈린다. */
  readonly severity: ToastSeverity;
  /** 알릴 말. 한 줄을 넘으면 접지 않고 늘어난다 — 잘라 놓으면 무슨 일인지 모른다. */
  readonly message: string;
  /** 아래 오른쪽 단추. 없으면 그 줄도 없다. */
  readonly action?: ReactNode;
  /** 밀리초. 주면 스스로 사라진다. 없으면 ×로만 닫힌다. */
  readonly timeout?: number;
  /** ×를 누르거나 시간이 다 됐을 때. */
  readonly onDismiss?: () => void;
}

/**
 * 토스트 하나. **색은 아이콘에만 싣는다** — 면까지 물들이면 읽을 글이 묻힌다.
 *
 * `timeout`을 주면 그만큼 뒤에 스스로 닫는다. 시계를 **컴포넌트가 든다**: 언제 뜨는지는
 * 화면이 아는 일이라, 목록을 쥔 쪽이 줄마다 타이머를 거는 것보다 여기가 가깝다.
 */
export const ToastItem = ({
  severity,
  message,
  action,
  timeout,
  onDismiss,
  className,
  ref,
  ...props
}: ToastItemProps) => {
  useEffect(() => {
    if (timeout === undefined) return undefined;
    const id = setTimeout(() => onDismiss?.(), timeout);
    return () => clearTimeout(id);
  }, [timeout, onDismiss]);

  return (
    <div
      ref={ref}
      role="status"
      {...props}
      data-severity={severity}
      data-component="Toast/Item"
      className={clsx(className, styles["item"])}
    >
      <span className={styles["line"]}>
        <Icon iconId={GLYPH[severity]} size="sm" className={styles["glyph"]} />
        <span className={styles["message"]}>{message}</span>
        <IconButton
          variant="invisible"
          size="small"
          aria-label="닫기"
          onClick={() => onDismiss?.()}
          icon={() => <Icon iconId="close" size="sm" />}
        />
      </span>
      {action === undefined ? null : <span className={styles["actions"]}>{action}</span>}
    </div>
  );
};
