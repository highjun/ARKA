import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./Bottom.module.css";
import { BottomHeader } from "./Header";
import { BottomPanel } from "./Panel";

/** 아래 창 전체. `children`은 `.Header`와 `.Panel`이다. */
export interface BottomRootProps extends Omit<ComponentPropsWithoutRef<"section">, "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** `.Header` + `.Panel`. */
  readonly children?: ReactNode;
}

/**
 * 편집 자리 아래 창 — 확장의 `BottomDescriptor`가 탭 하나씩 꽂힌다. 터미널이 여기다.
 *
 * **사이드바와 같은 그릇이 아니다.** 한때 `Panel` 하나가 둘을 겸하고 머리를 `kind` 축으로
 * 갈랐는데, 머리에 무엇이 오는지는 그릇이 정할 일이 아니었다 — 사이드바 머리는 제목 하나지만
 * 아래 창 머리는 **탭 줄**이다.
 *
 * 높이는 우선 고정이다 — 끌어서 바꾸는 손잡이는 첫 기여자가 생길 때.
 */
const BottomRoot = ({ className, children, ref, ...props }: BottomRootProps) => (
  <section
    ref={ref}
    aria-label="아래 창"
    {...props}
    data-component="Bottom"
    className={clsx(className, styles["root"])}
  >
    {children}
  </section>
);

/**
 * 부품은 `Object.assign`으로 붙인다 — `Bottom.Header`·`Bottom.Panel`.
 *
 * 부품 함수의 이름이 `Bottom<부품>`인 것은 react-docgen-typescript가 파일의 최상위 export만
 * 컴포넌트로 인식해서다 — Docs 페이지의 서브컴포넌트 Props 표가 그 이름으로 붙는다.
 */
export const Bottom = Object.assign(BottomRoot, { Header: BottomHeader, Panel: BottomPanel });

export type { BottomTab } from "./Header";
