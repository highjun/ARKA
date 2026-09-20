import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./TitleBar.module.css";

/** `children`을 막는다 — 자리가 왼쪽·가운데·오른쪽 셋으로 정해져 있다. */
export interface TitleBarProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 왼쪽 — 마크와 작업 공간 이름. 사이드바 토글도 여기 온다. */
  readonly brand?: ReactNode;
  /** 가운데 — `CommandCenter`. 없으면 그 칸이 빈다. */
  readonly center?: ReactNode;
  /** 오른쪽 — 빌드 표시 · 알림 종 · 밝기 토글. */
  readonly actions?: ReactNode;
}

/**
 * 창 맨 위 줄. 왼쪽·가운데·오른쪽 세 자리를 낸다.
 *
 * **가운데는 격자가 잡는다**(`1fr auto 1fr`). 좌우를 `space-between`으로 밀면 가운데 칸이
 * 양쪽 내용 길이에 따라 흔들린다 — 작업 공간 이름이 길어지면 명령 칸이 오른쪽으로 밀린다.
 */
export const TitleBar = ({ brand, center, actions, className, ref, ...props }: TitleBarProps) => (
  <div ref={ref} {...props} data-component="TitleBar" className={clsx(className, styles["root"])}>
    <span className={styles["group"]}>{brand}</span>
    <span className={styles["center"]}>{center}</span>
    <span className={clsx(styles["group"], styles["trailing"])}>{actions}</span>
  </div>
);
