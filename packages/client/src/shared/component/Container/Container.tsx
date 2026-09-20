import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Container.module.css";

/** `none`은 테두리와 배경을 지운다 — 자리는 그대로 차지한다. */
type ContainerChrome = "visible" | "none";

/**
 * 어느 축이 넘칠 때 스크롤할지. `'none'`은 아예 자르지 않는다(높이 제약 없는 카드).
 *
 * 축을 고르는 이유는 한쪽만 켜야 하는 자리가 있어서다 — `Tab`의 탭 스트립은 가로로만 넘쳐야
 * 하는데 양쪽을 켜면 아이콘의 1px 광학 보정 같은 미세한 세로 오버플로에도 세로 스크롤바가
 * 함께 뜬다(2026-08-31 지적).
 */
type ContainerScroll = "auto" | "none" | "horizontal" | "vertical";

/** 자기 치수를 갖지 않는다 — 높이·폭은 쓰는 쪽이 `className`으로 준다. */
export interface ContainerProps extends ComponentPropsWithoutRef<"div"> {
  /** 스크롤하는 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 테두리·배경·radius. 프레임 안쪽 우물로 쓸 때는 `none`. */
  readonly chrome?: ContainerChrome;
  /** 어느 축이 스크롤하나. 기본값 `'auto'`(양쪽). */
  readonly scroll?: ContainerScroll;
}

/**
 * 스크롤이 필요한 자리의 기본 상자 — raw `overflow: auto` div를 직접 두지 않고 이걸 쓴다.
 * 스크롤바 모양이 앱 전체에서 같아야 하기 때문이다.
 *
 * 예전에는 Radix ScrollArea로 스크롤바를 직접 그렸다. `scrollbar-width`·`scrollbar-color`가
 * Baseline에 들어오면서 그 일이 CSS 두 줄이 됐고, 라이브러리가 끼워 넣던 래퍼
 * `div`를 우회하느라 쌓였던 CSS 다섯 뭉치가 함께 사라졌다 — 퍼센트 높이가 끊기던 것,
 * `display: table` 때문에 ellipsis가 안 걸리던 것, 빈 공간에서 우클릭이 안 먹던 것이 전부
 * 그 래퍼 탓이었다.
 *
 * `ref`는 실제로 스크롤되는 원소에 꽂힌다 — 이제 그것이 루트 자신이다.
 */
export const Container = ({
  children,
  chrome = "visible",
  scroll = "auto",
  className,
  ref,
  ...props
}: ContainerProps) => (
  <div
    {...props}
    ref={ref}
    data-component="Container"
    data-chrome={chrome}
    data-scroll={scroll}
    className={clsx(className, styles["root"])}
  >
    {children}
  </div>
);
