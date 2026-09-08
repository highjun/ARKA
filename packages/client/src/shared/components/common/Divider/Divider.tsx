import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './Divider.module.css';

export type DividerOrientation = 'horizontal' | 'vertical';

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
