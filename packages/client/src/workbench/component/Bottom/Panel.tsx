import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./Bottom.module.css";

/** 고른 아래 창의 내용이 서는 자리. */
export interface BottomPanelProps extends ComponentPropsWithoutRef<"div"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * 고른 `BottomDescriptor.Content`가 그려지는 자리. **넘치면 여기서 스크롤한다** —
 * 터미널 출력이 길어지는 것이 기본이라, 사이드바와 달리 그릇이 스크롤을 든다.
 */
export const BottomPanel = ({ className, children, ref, ...props }: BottomPanelProps) => (
  <div ref={ref} role="tabpanel" {...props} data-component="Bottom/Panel" className={clsx(className, styles["panel"])}>
    {children}
  </div>
);
