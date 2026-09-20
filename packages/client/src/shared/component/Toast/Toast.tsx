import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { ToastItem } from "./Item";
import styles from "./Toast.module.css";

/** 어느 구석에 쌓나. 기본값 `'bottom-right'`. */
type ToastPlacement = "bottom-right" | "bottom-left";

/** `children`은 `.Item`들이다. */
export interface ToastRootProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 어느 구석에 쌓나. */
  readonly placement?: ToastPlacement;
  /** `.Item`들. 비면 아무것도 안 그린다. */
  readonly children?: ReactNode;
}

/**
 * 스스로 알리고 사라지는 것이 쌓이는 자리. **앱을 막지 않는다** — 대화상자와 가르는 기준이다.
 *
 * 화면 구석에 떠 있으므로 `pointer-events`를 껐다가 줄에서만 되켠다. 빈 자리가 그 아래 것을
 * 가로채면 안 된다.
 *
 * `aria-live="polite"`다 — 읽던 것을 끊지 않고 사이에 끼워 읽는다. 급한 것은 대화상자가 맡는다.
 */
const ToastRoot = ({ placement = "bottom-right", className, children, ref, ...props }: ToastRootProps) => (
  <div
    ref={ref}
    aria-live="polite"
    {...props}
    data-placement={placement}
    data-component="Toast"
    className={clsx(className, styles["root"])}
  >
    {children}
  </div>
);

/**
 * 부품은 `Object.assign`으로 붙인다 — `Toast.Item`.
 *
 * 부품 함수의 이름이 `Toast<부품>`인 것은 react-docgen-typescript가 파일의 최상위 export만
 * 컴포넌트로 인식해서다 — Docs 페이지의 서브컴포넌트 Props 표가 그 이름으로 붙는다.
 */
export const Toast = Object.assign(ToastRoot, { Item: ToastItem });
