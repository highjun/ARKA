import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./StatusIndicator.module.css";
import { Icon } from "#component/Icon";
import type { IconId } from "#component/Icon";

/** 서버의 `RunStatus` 중 화면이 구분해 보여주는 넷만 남긴 것이다. */
export type StatusIndicatorStatus = "running" | "done" | "waitingInput" | "error";

const LABEL: Record<StatusIndicatorStatus, string> = {
  running: "작업 중",
  done: "완료",
  waitingInput: "입력 대기",
  error: "오류",
};

/** `settingsGear`는 `running`에서만 `[data-status='running']` CSS로 회전한다 — 아이콘 자체는 정적이다. */
const ICON_OF: Record<StatusIndicatorStatus, IconId> = {
  running: "settingsGear",
  done: "check",
  waitingInput: "question",
  error: "error",
};

/** `children`을 막는다 — 문구는 `status`가 정한다. */
export interface StatusIndicatorProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLSpanElement>;
  /** 표시할 상태 — 아이콘·라벨·색상을 함께 결정한다. */
  readonly status: StatusIndicatorStatus;
}

/** `ref`를 통과시킨다 — `Icon`/`FileIcon`/`Timestamp`와 같은 근거다. */
export const StatusIndicator = ({ status, className, ref, ...props }: StatusIndicatorProps) => (
  <span
    ref={ref}
    role="img"
    aria-label={LABEL[status]}
    title={LABEL[status]}
    data-status={status}
    className={clsx(className, styles["StatusIndicator"])}
    {...props}
    data-component="StatusIndicator"
  >
    <Icon iconId={ICON_OF[status]} size="sm" />
  </span>
);
