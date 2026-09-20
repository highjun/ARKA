import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Container.module.css";

type ContainerChrome = "visible" | "none";

type ContainerScroll = "auto" | "none" | "horizontal" | "vertical";

export interface ContainerProps extends ComponentPropsWithoutRef<"div"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly chrome?: ContainerChrome;
  readonly scroll?: ContainerScroll;
}

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
