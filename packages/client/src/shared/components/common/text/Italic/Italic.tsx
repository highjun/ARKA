import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './Italic.module.css';

/** `<em>`으로 그린다 — 기울임뿐 아니라 강조를 접근성 트리에 남긴다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface ItalicRootProps extends HTMLAttributes<HTMLElement> {}

/** 마크다운 기울임 강조(`*text*`)에 대응하는 인라인 요소라 `em`이다. */
const Root = forwardRef<HTMLElement, ItalicRootProps>(({ className, ...props }, ref) => (
  <em ref={ref} {...props} data-component="Italic" className={clsx(className, styles['Italic'])} />
));
Root.displayName = 'Italic';

export type { ItalicRootProps as ItalicProps };
export const Italic = assembleCompound('Italic', Root, {});
