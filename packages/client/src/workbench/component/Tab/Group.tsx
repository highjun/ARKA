import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Tab.module.css";

/** 칸 하나 — 띠(`Tab.Strip`)와 내용 자리(`Tab.Panel`)를 세로로 쌓는다. */
export interface TabGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly children?: ReactNode;
  /** 활성 여부. 트리에 하나뿐이라 뿌리가 `activeGroupId`로 들고 여기엔 참·거짓만 온다. */
  readonly isActive?: boolean;
  /** 형제 사이의 비율(%). 생략하면 남은 자리를 고르게 나눠 갖는다. */
  readonly size?: number;
}

export const Group = ({ children, isActive = false, size, className, style, ref, ...props }: TabGroupProps) => (
  <div
    ref={ref}
    {...props}
    style={size === undefined ? style : { ...style, flexBasis: `${size}%`, flexGrow: 0, flexShrink: 0 }}
    data-active={isActive ? "" : undefined}
    data-component="Tab/Group"
    className={clsx(className, styles["group"])}
  >
    {children}
  </div>
);
