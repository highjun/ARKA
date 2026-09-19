import type { Disposable } from "#core/di";

/** 알림의 무게. 아이콘과 색만 가른다 — 동작은 셋 다 같다. */
export type Severity = "info" | "warning" | "error";

/** 알림 하나. 닫을 때까지 남는다. */
export interface Notification {
  readonly id: string;
  readonly severity: Severity;
  readonly message: string;
}

declare module "#core/di" {
  /** `INotifications`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.notifications": INotifications;
  }
}
/**
 * 화면 구석에 쌓이는 알림. 확장도 여기에 낸다 — 그것이 어떻게 보이는지는 모른다.
 * 같은 메시지가 잇달아 오면 하나로 합친다 — 재연결 루프 같은 것이 토스트를 도배하지 않게.
 */
export interface INotifications {
  /** 아직 닫히지 않은 것들. 오래된 것이 앞이다. */
  readonly items: readonly Notification[];
  /** 돌려주는 것은 나중에 지울 수 있는 id다. */
  notify(severity: Severity, message: string): string;
  dismiss(id: string): void;
  onDidChange(listener: () => void): Disposable;
}
