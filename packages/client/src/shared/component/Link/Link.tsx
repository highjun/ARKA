import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './Link.module.css';
import { Link as PrimerLink } from '@primer/react';
import type { LinkProps as PrimerLinkProps } from '@primer/react';

/** `plain`은 Primer에 없는 값이라 이 컴포넌트가 더한 것이다 — 본문과 같은 색이다. */
export type LinkTone = 'accent' | 'muted' | 'plain';

/** Primer의 `muted`를 막고 `tone`으로 받는다 — 색 선택지가 두 갈래로 갈리지 않게. */
export interface LinkRootProps extends Omit<PrimerLinkProps, 'muted'> {
  /**
   * 글자 색. 기본값 `'accent'`(Primer 기본 강조색). `'muted'`는 Primer의 `muted` prop을 그대로
   * 전달한다. `'plain'`은 Primer에 없는 값이라 이 컴포넌트가 새로 추가한다 — 본문과 같은 색으로
   * "링크처럼 안 보이는 링크"가 필요한 자리(파일 탐색기의 행 전체가 링크인 경우 등)를 위해서다.
   */
  readonly tone?: LinkTone;
}

/**
 * Primer `Link`를 그대로 감싼다 — `tone="accent"`/`"muted"`는 Primer가 이미 갖고 있어 다시
 * 구현하지 않는다(`IconButton`과 같은 이유). `tone="plain"`만 이 컴포넌트가 새로 더한다.
 */
const Root = forwardRef<HTMLAnchorElement, LinkRootProps>(({ tone = 'accent', className, ...props }, ref) => (
  <PrimerLink
    {...props}
    ref={ref}
    muted={tone === 'muted'}
    data-tone={tone}
    data-component="Link"
    className={clsx(className, styles['Link'])}
  />
));
Root.displayName = 'Link';

export type { LinkRootProps as LinkProps };
export const Link = assembleCompound('Link', Root, {});
