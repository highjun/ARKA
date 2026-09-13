import type { HTMLAttributes, Ref } from 'react';
import { clsx } from 'clsx';
import styles from './Heading.module.css';

/** 시각 크기와 접근성 트리가 같이 따라온다 — 크기만 바꾸려고 레벨을 고르지 않는다. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** `level`은 필수다 — 기본값을 두면 문서 구조가 조용히 어긋난다. */
export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLHeadingElement>;
  /** 시맨틱 헤딩 레벨(`h1`~`h6`) — 접근성 트리·시각 크기에 그대로 반영된다. */
  readonly level: HeadingLevel;
}

/** `level`이 그대로 `h1`~`h6` 태그가 된다 — 크기는 태그가 아니라 CSS가 정한다. */
export const Heading = ({ level, className, ref, ...props }: HeadingProps) => {
  const Tag = `h${level}` as 'h1';
  return (
    <Tag ref={ref} {...props} data-heading-level={level} data-component="Heading" className={clsx(className, styles['Heading'])} />
  );
};

