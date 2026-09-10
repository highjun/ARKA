import { forwardRef } from 'react';
import type { BlockquoteHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './QuoteBlock.module.css';

/** `style`을 막는다 — 왼쪽 띠의 색과 두께는 토큰이 정한다. */
export type QuoteBlockRootProps = Omit<BlockquoteHTMLAttributes<HTMLQuoteElement>, 'style'>;

const Root = forwardRef<HTMLQuoteElement, QuoteBlockRootProps>(
  ({ className, ...props }, ref) => (
    <blockquote ref={ref} className={clsx(className, styles['QuoteBlock'])} {...props} data-component="QuoteBlock" />
  ),
);
Root.displayName = 'QuoteBlock';

export type { QuoteBlockRootProps as QuoteBlockProps };
export const QuoteBlock = assembleCompound('QuoteBlock', Root, {});
