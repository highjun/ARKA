import type { HTMLAttributes, Ref } from 'react';
import { clsx } from 'clsx';
import styles from './Icon.module.css';
import { icons } from './data';
import codicon from '@iconify-json/codicon/icons.json';
import octicon from '@iconify-json/octicon/icons.json';
import * as Iconify from '@iconify/react/offline';

/** `ICON_MAP`에 있는 것만 쓸 수 있다 — 세트 전체가 번들에 있어도 목록 밖은 타입이 막는다. */
export type IconId = keyof typeof icons;
/** 픽셀이 아니라 토큰이다. 기본값은 `md`. */
type IconSize = 'sm' | 'md' | 'lg';
export const ICON_MAP: Record<IconId, string> = icons;

/**
 * 코디콘·옥티콘 전체 아이콘 세트를 통째로 번들에 넣는다(오프라인 동작 — `api.iconify.design` 외부 API 의존 제거). 실제 쓰는 건 ICON_MAP에 있는 것뿐이지만 JSON 통짜 import라 개별 아이콘 단위 트리쉐이킹은 안 된다.
 */
Iconify.addCollection(codicon as Parameters<typeof Iconify.addCollection>[0]);
Iconify.addCollection(octicon as Parameters<typeof Iconify.addCollection>[0]);

/** `id`를 막는다 — `iconId`와 헷갈려 잘못 넘기는 것을 타입에서 끊는다. */
export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'id'> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLSpanElement>;
  /** 표시할 아이콘. */
  readonly iconId: IconId;
  /** Icon의 크기. sm, md, lg 중 하나로 기본값은 md. */
  readonly size?: IconSize;
}

/** `ICON_MAP`의 아이콘 하나를 그린다 — 장식이라 스크린리더에서 숨긴다. */
export const Icon = ({ className, iconId, size = 'md', ref, ...props }: IconProps) => (
  <span
    ref={ref}
    aria-hidden="true"
    data-icon={iconId}
    data-size={size}
    className={clsx(className, styles['Icon'])}
    {...props}
    data-component="Icon"
  >
    <Iconify.Icon aria-hidden="true" focusable="false" height="100%" width="100%" icon={ICON_MAP[iconId]} />
  </span>
);

