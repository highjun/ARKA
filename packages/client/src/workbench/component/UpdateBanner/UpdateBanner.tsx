import { Button } from '@primer/react';
import { Icon, Text } from '#components/common';
import styles from './UpdateBanner.module.css';

export interface UpdateBannerProps {
  readonly onReload: () => void;
}

/**
 * 캐시된 클라이언트가 서버보다 낡았을 때 맨 위에 뜨는 띠(→ ADR 0017). VSCode의 "다시 시작해 업데이트"
 * 알림과 같은 자리다 — 닫을 수 없다. 낡은 채로 쓰면 요청이 426으로 죽는다.
 */
export const UpdateBanner = ({ onReload }: UpdateBannerProps) => (
  <div data-component="UpdateBanner" role="status" className={styles['root']}>
    <Icon iconId="warning" size="sm" />
    <Text size="small">새 버전이 있다 — 이 화면은 서버와 다른 프로토콜을 쓰고 있다.</Text>
    <Button size="small" variant="primary" onClick={onReload}>
      다시 불러오기
    </Button>
  </div>
);
