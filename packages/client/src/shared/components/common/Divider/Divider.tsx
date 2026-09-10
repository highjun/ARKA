import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './Divider.module.css';

/** `vertical`은 높이를 부모에게서 받는다 — 스스로 늘어나지 않는다. */
export type DividerOrientation = 'horizontal' | 'vertical';

/** `style`을 막는다 — 선 두께와 색은 토큰이 정한다. */
export interface DividerRootProps extends Omit<HTMLAttributes<HTMLHRElement>, 'style'> {
  /** 선 방향. 기본값 `'horizontal'`. */
  readonly orientation?: DividerOrientation;
}

const Root = forwardRef<HTMLHRElement, DividerRootProps>(
  ({ className, orientation, ...props }, ref) => (
    <hr
      ref={ref}
      aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      data-orientation={orientation ?? 'horizontal'}
      className={clsx(className, styles['Divider'])}
      {...props}
      data-component="Divider"
    />
  ),
);
Root.displayName = 'Divider';

export type { DividerRootProps as DividerProps };
export const Divider = assembleCompound('Divider', Root, {});
