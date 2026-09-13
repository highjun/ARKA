import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import styles from './Text.module.css';

/** `caption`은 크기가 고정이라 `size`와 다른 축이다. */
export type TextVariant = 'body' | 'caption';
/** `variant='body'`일 때만 듣는다. 기본값은 `medium`. */
export type TextSize = 'small' | 'medium' | 'large';
/** 색만 바꾼다 — 굵기나 크기는 그대로다. */
export type TextTone = 'default' | 'muted' | 'danger';

/** `<span>`이라 블록이 필요하면 감싸는 쪽이 만든다. */
export interface TextProps extends HTMLAttributes<HTMLSpanElement> {
  /** typography 역할. 기본값 `'body'`(일반 본문). `'caption'`은 Primer가 별도로 두는
   * 압축된 한 줄 전용 스케일이라 `size`와 다른 축이다. */
  readonly variant?: TextVariant;
  /** 글자 크기 — `variant='body'`일 때만 의미가 있다(`caption`은 크기가 고정이라 무시된다).
   * 기본값 `'medium'`(Primer가 "Default body text size for UI"로 명시한 값). */
  readonly size?: TextSize;
  /** 글자 색. `muted`는 보조/저강조 정보(헬퍼텍스트·캡션 등), `danger`는 위험·오류 강조.
   * 기본값 `'default'`(상속받은 색 그대로, CSS를 안 건다). */
  readonly tone?: TextTone;
}

/**
 * 인라인 텍스트라 `span`이다(`Timestamp`와 같은 선택). `variant`/`size`/`tone`을
 * `data-text-variant`/`data-text-size`/`data-text-tone`으로 드러내고 CSS가 속성 선택자로
 * 받는다 — 값마다 어떤 토큰을 쓸지는 스타일 결정이라
 * 여기 두지 않는다. `variant="caption"`+`tone="muted"` 조합이 옛 `Caption` 컴포넌트와
 * 동일해, 그 중복을 없애며 여기로 흡수했다(2026-09-06).
 */
export const Text = forwardRef<HTMLSpanElement, TextProps>(
  ({ variant = 'body', size = 'medium', tone = 'default', className, ...props }, ref) => (
    <span
      ref={ref}
      {...props}
      data-text-variant={variant}
      data-text-size={size}
      data-text-tone={tone}
      data-component="Text"
      className={clsx(className, styles['Text'])}
    />
  ),
);

