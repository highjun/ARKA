import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Container.module.css";

type ContainerChrome = "visible" | "none";

type ContainerScroll = "auto" | "none" | "horizontal" | "vertical";

type ContainerScrollbar = "auto" | "none";

export interface ContainerProps extends ComponentPropsWithoutRef<"div"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly chrome?: ContainerChrome;
  readonly scroll?: ContainerScroll;
  /** 막대를 그릴지. 스스로 손잡이를 그리는 자리는 `"none"`으로 끈다. */
  readonly scrollbar?: ContainerScrollbar;
}

export const Container = ({
  children,
  chrome = "visible",
  scroll = "auto",
  scrollbar = "auto",
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
    data-scrollbar={scrollbar}
    className={clsx(className, styles["root"])}
  >
    {children}
  </div>
);
