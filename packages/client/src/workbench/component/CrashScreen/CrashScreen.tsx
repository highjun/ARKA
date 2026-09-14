import { Button, Heading } from '@primer/react';
import { Text } from '#component/Text';
import styles from './CrashScreen.module.css';

/** `onReload`는 필수다 — 사용자가 빠져나갈 길이 없는 화면을 만들지 않는다. */
export interface CrashScreenProps {
  /** 잡힌 오류의 메시지. 스택은 보여주지 않는다 — 사용자가 할 수 있는 일은 새로고침뿐이다. */
  readonly message: string;
  readonly onReload: () => void;
}

/**
 * 셸이 렌더 중 죽었을 때 빈 화면 대신 보이는 것. VSCode의 "창을 다시 로드" 대화상자와 같은 자리다.
 */
export const CrashScreen = ({ message, onReload }: CrashScreenProps) => (
  <div data-component="CrashScreen" role="alert" className={styles['root']}>
    <Heading as="h1" variant="large">화면을 그리다 오류가 났다</Heading>
    <Text tone="muted">저장하지 않은 변경은 남아 있지 않을 수 있다. 다시 불러오면 마지막 저장 상태로 돌아간다.</Text>
    <pre className={styles['detail']}>{message}</pre>
    <Button variant="primary" onClick={onReload}>
      다시 불러오기
    </Button>
  </div>
);
