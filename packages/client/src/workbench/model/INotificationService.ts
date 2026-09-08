import { createToken, type Disposable } from '#core/di';

export type NotificationSeverity = 'info' | 'warning' | 'error';

export type Notification = {
  readonly id: string;
  readonly severity: NotificationSeverity;
  readonly message: string;
  /** ms since epoch. */
  readonly at: number;
};

export const NotificationServiceToken = createToken<INotificationService>('notificationService');
/**
 * 사용자에게 알릴 것을 모으는 자리. VSCode의 `INotificationService`에 해당한다.
 *
 * 화면(토스트)은 이것을 구독해 그린다. 익스텐션은 이것으로 말하고, 그것이 어떻게 보이는지는 모른다.
 * 같은 메시지가 잇달아 오면 하나로 합친다 — 재연결 루프 같은 것이 토스트를 도배하지 않게.
 */
export interface INotificationService {
  /** 아직 닫히지 않은 것들. 오래된 것이 앞이다. */
  readonly notifications: readonly Notification[];
  /** 알림을 띄우고 그 id를 돌려준다. */
  notify(severity: NotificationSeverity, message: string): string;
  dismiss(id: string): void;
  /** 목록이 바뀔 때마다 부른다. */
  onDidChange(listener: () => void): Disposable;
}
