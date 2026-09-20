import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./CommandCenter.module.css";

/** `children`을 막는다 — 적히는 것은 `value` 하나다. */
export interface CommandCenterProps extends Omit<ComponentPropsWithoutRef<"button">, "children" | "value"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLButtonElement>;
  /** 적히는 말 — 보통 작업 공간 이름이다. */
  readonly value: string;
}

/**
 * 제목 줄 가운데 칸. 누르면 명령 팔레트가 열린다 — VS Code의 명령 센터와 같은 자리다.
 *
 * **입력칸처럼 생겼지만 단추다.** 글자를 여기서 치는 것이 아니라 팔레트를 여는 것이라,
 * 읽어 주는 이름도 「명령 팔레트 열기」다.
 */
export const CommandCenter = ({ value, className, ref, ...props }: CommandCenterProps) => (
  <button
    ref={ref}
    type="button"
    aria-label="명령 팔레트 열기"
    {...props}
    data-component="CommandCenter"
    className={clsx(className, styles["root"])}
  >
    {value}
  </button>
);
