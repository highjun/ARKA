import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './Highlight.module.css';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface HighlightRootProps extends HTMLAttributes<HTMLElement> {}

/** 마크다운 확장 강조(`==text==`)에 대응하는 인라인 요소라 `mark`다. */
const Root = forwardRef<HTMLElement, HighlightRootProps>(({ className, ...props }, ref) => (
  <mark ref={ref} {...props} data-component="Highlight" className={clsx(className, styles['Highlight'])} />
));
Root.displayName = 'Highlight';

export type { HighlightRootProps as HighlightProps };
export const Highlight = assembleCompound('Highlight', Root, {});
