import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./Bottom.module.css";
import { BottomHeader } from "./Header";
import { BottomPanel } from "./Panel";

export interface BottomRootProps extends Omit<ComponentPropsWithoutRef<"section">, "children"> {
  readonly ref?: Ref<HTMLElement>;
  readonly children?: ReactNode;
}

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

export const Bottom = Object.assign(BottomRoot, { Header: BottomHeader, Panel: BottomPanel });

export type { BottomItem } from "./Header";
