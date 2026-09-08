import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './Bold.module.css';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface BoldRootProps extends HTMLAttributes<HTMLElement> {}

/** 마크다운 굵게 강조(`**text**`)에 대응하는 인라인 요소라 `strong`이다. */
const Root = forwardRef<HTMLElement, BoldRootProps>(({ className, ...props }, ref) => (
  <strong ref={ref} {...props} data-component="Bold" className={clsx(className, styles['Bold'])} />
));
Root.displayName = 'Bold';

export type { BoldRootProps as BoldProps };
export const Bold = assembleCompound('Bold', Root, {});
