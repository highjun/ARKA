import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { Container } from "#ui/Container";
import styles from "./Tab.module.css";

/** 내용 자리. `role="tabpanel"`은 알아서 채우고, 넘치는 것은 `Container`가 든다. */
export interface TabPanelProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly children?: ReactNode;
}

export const Panel = ({ children, className, ref, ...props }: TabPanelProps) => (
  <div
    ref={ref}
    {...props}
    role={props.role ?? "tabpanel"}
    data-component="Tab/Panel"
    className={clsx(className, styles["panel"])}
  >
    <Container chrome="none" className={styles["panelScroll"]}>
      {children}
    </Container>
  </div>
);
