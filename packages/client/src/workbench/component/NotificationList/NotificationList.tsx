import { IconButton } from '@primer/react';
import { Icon, Text } from '#components/common';
import type { IconId } from '#components/common';
import styles from './NotificationList.module.css';

export type NotificationListItem = {
  readonly id: string;
  readonly severity: 'info' | 'warning' | 'error';
  readonly message: string;
};

export interface NotificationListProps {
  readonly items: readonly NotificationListItem[];
  readonly onDismiss: (id: string) => void;
}

const ICON: Record<NotificationListItem['severity'], IconId> = { info: 'bell', warning: 'warning', error: 'error' };

/**
 * 화면 오른쪽 아래에 쌓이는 알림. VSCode의 토스트와 같은 자리 — 사용자가 닫을 때까지 남는다.
 * 자동으로 사라지지 않는 이유는 폰에서 눈을 뗀 사이에 지나가면 못 보기 때문이다.
 */
export const NotificationList = ({ items, onDismiss }: NotificationListProps) => {
  if (items.length === 0) return null;
  return (
    <div data-component="NotificationList" role="region" aria-label="알림" className={styles['root']}>
      {items.map((item) => (
        <div key={item.id} role="status" data-severity={item.severity} className={styles['item']}>
          <Icon iconId={ICON[item.severity]} size="sm" />
          <Text size="small" className={styles['message']}>
            {item.message}
          </Text>
          <IconButton variant="invisible" size="small" aria-label="알림 닫기" icon={() => <Icon iconId="close" size="sm" />} onClick={() => onDismiss(item.id)} />
        </div>
      ))}
    </div>
  );
};
