import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import { Button, Heading } from "@primer/react";
import { Text } from "#component/Text";
import styles from "./CrashScreen.module.css";

export interface CrashScreenProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly message: string;
  readonly onReload?: () => void;
}

export const CrashScreen = ({ message, onReload, className, ref, ...props }: CrashScreenProps) => (
  <div ref={ref} {...props} data-component="CrashScreen" role="alert" className={clsx(className, styles["root"])}>
    <Heading as="h1" variant="large">
      화면을 그리다 오류가 났다
    </Heading>
    <Text tone="muted">저장하지 않은 변경은 남아 있지 않을 수 있다. 다시 불러오면 마지막 저장 상태로 돌아간다.</Text>
    <pre className={styles["detail"]}>{message}</pre>
    <Button variant="primary" onClick={onReload}>
      다시 불러오기
    </Button>
  </div>
);
