import { forwardRef } from 'react';
import type { BlockquoteHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './QuoteBlock.module.css';

export type QuoteBlockRootProps = Omit<BlockquoteHTMLAttributes<HTMLQuoteElement>, 'style'>;

const Root = forwardRef<HTMLQuoteElement, QuoteBlockRootProps>(
  ({ className, ...props }, ref) => (
    <blockquote ref={ref} className={clsx(className, styles['QuoteBlock'])} {...props} data-component="QuoteBlock" />
  ),
);
Root.displayName = 'QuoteBlock';

export type { QuoteBlockRootProps as QuoteBlockProps };
export const QuoteBlock = assembleCompound('QuoteBlock', Root, {});
