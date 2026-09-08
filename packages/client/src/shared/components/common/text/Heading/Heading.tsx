import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './Heading.module.css';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingRootProps extends HTMLAttributes<HTMLHeadingElement> {
  /** 시맨틱 헤딩 레벨(`h1`~`h6`) — 접근성 트리·시각 크기에 그대로 반영된다. */
  readonly level: HeadingLevel;
}

const Root = forwardRef<HTMLHeadingElement, HeadingRootProps>(({ level, className, ...props }, ref) => {
  const Tag = `h${level}` as 'h1';
  return (
    <Tag ref={ref} {...props} data-heading-level={level} data-component="Heading" className={clsx(className, styles['Heading'])} />
  );
});
Root.displayName = 'Heading';

export type { HeadingRootProps as HeadingProps };
export const Heading = assembleCompound('Heading', Root, {});
