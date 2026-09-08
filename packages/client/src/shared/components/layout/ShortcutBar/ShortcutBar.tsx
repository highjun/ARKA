import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './ShortcutBar.module.css';
import { Container } from '#components/layout/Container';

/**
 * Obsidian 모바일의 하단 액세서리 바를 참고했다 — 아이콘 버튼들을 가로 1행에 나열하고, 넘치면
 * 옆으로 스크롤한다(`Container scroll="horizontal"` 재사용, 새 스크롤 로직을 만들지 않는다).
 * 터치 기기에서만 뜻이 있는 UI라 `pointer: fine`에서는 스스로 숨는다(소비처가 매번 기기 종류를
 * 판별할 필요가 없게).
 */
export type ShortcutBarRootProps = HTMLAttributes<HTMLDivElement>;

const Root = forwardRef<HTMLDivElement, ShortcutBarRootProps>(({ children, className, ...props }, ref) => (
  // Container는 스스로 `data-component="Container"`를 찍는다(내부 구현 세부사항) — 이 컴포넌트의
  // 공개 표식은 바깥 div가 갖는다.
  <div ref={ref} {...props} data-component="ShortcutBar" className={clsx(className, styles['root'])}>
    <Container chrome="none" scroll="horizontal">
      <div className={styles['list']}>{children}</div>
    </Container>
  </div>
));
Root.displayName = 'ShortcutBar';

export type { ShortcutBarRootProps as ShortcutBarProps };
export const ShortcutBar = assembleCompound('ShortcutBar', Root, {});
