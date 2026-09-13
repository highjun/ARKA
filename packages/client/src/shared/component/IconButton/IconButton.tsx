import { forwardRef } from 'react';
import { clsx } from 'clsx';
import styles from './IconButton.module.css';
import { IconButton as PrimerIconButton } from '@primer/react';
import type { IconButtonProps as PrimerIconButtonProps } from '@primer/react';

/** Primer `IconButtonProps` 계약을 그대로 재수출한다 — "다른 API의 아이콘 버튼"이 아니라
 *  "그 API 그대로에 CSS 한 줄만 더한 아이콘 버튼"이라, 계약을 새로 선언하면 오히려 둘이
 *  갈라진다. */
export type IconButtonProps = PrimerIconButtonProps;

/**
 * Primer `IconButton`을 그대로 감싼다 — `variant`·`size`·hover/focus 배경·(호버 시) 툴팁까지
 * 전부 `IconButton`이 이미 갖고 있어 다시 구현하지 않는다(`ModeToggle`과 같은 이유).
 *
 * 이 컴포넌트가 유일하게 더하는 것은 `.root`에 걸리는 coarse-pointer(터치) 확대
 * CSS(`IconButton.module.css`)뿐이다 — Shell·Tab·ActivityBar·TextEditor 등 아이콘 버튼을 쓰는
 * 모든 자리가 각자 미디어쿼리를 반복하는 대신 `@primer/react`의 `IconButton` import를 이
 * 컴포넌트로 바꾸기만 하면 똑같이 커진다(2026-09-02, 사용자 피드백 "모바일에서 버튼이 작다"
 * 대응 — 컴포넌트마다 반복하던 걸 여기 하나로 모았다).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => (
  <PrimerIconButton
    {...props}
    ref={ref}
    data-component="IconButton"
    className={clsx(props.className, styles['root'])}
  />
));

