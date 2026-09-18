import type { HTMLAttributes, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Text.module.css";

/** 글자 크기. 기본값은 `medium`. */
type TextSize = "small" | "medium" | "large";
/** 색만 바꾼다 — 굵기나 크기는 그대로다. */
type TextTone = "default" | "muted" | "danger";

/** `<span>`이라 블록이 필요하면 감싸는 쪽이 만든다. */
export interface TextProps extends HTMLAttributes<HTMLSpanElement> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLSpanElement>;
  /** 글자 크기. 기본값 `'medium'`(Primer가 "Default body text size for UI"로 명시한 값). */
  readonly size?: TextSize;
  /** 글자 색. `muted`는 보조/저강조 정보(헬퍼텍스트·캡션 등), `danger`는 위험·오류 강조.
   * 기본값 `'default'`(상속받은 색 그대로, CSS를 안 건다). */
  readonly tone?: TextTone;
}

/**
 * 인라인 텍스트라 `span`이다(`Timestamp`와 같은 선택). `size`/`tone`을
 * `data-text-size`/`data-text-tone`으로 드러내고 CSS가 속성 선택자로 받는다 — 값마다 어떤
 * 토큰을 쓸지는 스타일 결정이라 여기 두지 않는다.
 *
 * `variant`(body | caption) 축은 뺐다(2026-09-18) — 제품 17곳 중 명시한 곳이 없었고 `caption`은
 * 한 번도 렌더되지 않았다. 타이포 역할은 `size` 셋이 전부다.
 */
export const Text = ({ size = "medium", tone = "default", className, ref, ...props }: TextProps) => (
  <span
    ref={ref}
    {...props}
    data-text-size={size}
    data-text-tone={tone}
    data-component="Text"
    className={clsx(className, styles["Text"])}
  />
);
