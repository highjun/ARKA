import type { Disposable } from "#core/di";

/** 알림의 무게. 색과 글리프가 이것으로 갈린다. */
export type Severity = "info" | "warning" | "error";

/** 쌓인 알림 하나. */
export interface Notification {
  readonly id: string;
  readonly severity: Severity;
  readonly message: string;
  /** 온 때(epoch ms). 화면에는 「3분 전」처럼 상대 시각으로 적는다. */
  readonly at: number;
  /** 읽었나. **종의 배지는 안 읽은 수다** — 닫지 않은 수가 아니다. */
  readonly isRead: boolean;
  /**
   * 토스트가 스스로 걷히기까지의 밀리초. 없으면 사람이 누를 때까지 머문다.
   *
   * **안 읽은 것은 전부 토스트로 뜬다** — 이 값은 뜨느냐가 아니라 **얼마나 머무느냐**다.
   * 오류에 안 주는 까닭: 놓치면 안 되는 것이 조용히 사라지면 안 된다.
   *
   * 시간이 다 되어 걷히는 것은 **읽음이 아니다** — 아무도 누르지 않았다.
   */
  readonly timeout?: number;
}

/** `notify`에 얹는 것. 지금은 수명 하나다. */
export interface NotifyOptions {
  readonly timeout?: number;
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.notifications": INotifications;
  }
}

/**
 * 쌓이는 알림. 확장도 여기에 낸다 — **그것이 어떻게 보이는지는 모른다**(지금은 `arka:///notifications`
 * 탭이고, 제목 줄의 종이 그 탭을 연다).
 */
export interface INotifications {
  /** 오래된 것이 앞이다. */
  readonly items: readonly Notification[];
  /** 안 읽은 수. 종의 배지가 이 값이다. */
  readonly unreadCount: number;
  /** 만든 알림의 id를 돌려준다 — 같은 것이 이미 있으면 그 id다. */
  notify(severity: Severity, message: string, options?: NotifyOptions): string;
  /** 하나를 목록에서 지운다. 읽음 표시가 아니라 제거다. */
  dismiss(id: string): void;
  /**
   * 하나를 읽음으로. 이미 읽었거나 없는 id면 아무 일도 없다.
   *
   * **읽음은 낱개로만 된다** — 누른 것이 읽은 것이다. 목록을 여는 것만으로 다 읽음이 되면
   * 안 본 것이 배지에서 사라진다.
   */
  markRead(id: string): void;
  /** 목록을 비운다. */
  clear(): void;
  onDidChange(listener: () => void): Disposable;
}
