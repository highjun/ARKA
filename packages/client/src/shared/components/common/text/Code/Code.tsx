import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './Code.module.css';

/** 한 줄짜리 인라인 코드. 여러 줄은 `CodeBlock`이 맡는다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface CodeRootProps extends HTMLAttributes<HTMLElement> {}

/** 마크다운 인라인 코드에 대응하는 요소라 `code`다 — 문법 강조·복사 버튼을 갖춘 블록 코드는
 * `markdown/CodeBlock`이 담당한다. */
const Root = forwardRef<HTMLElement, CodeRootProps>(({ className, ...props }, ref) => (
  <code ref={ref} {...props} data-component="Code" className={clsx(className, styles['Code'])} />
));
Root.displayName = 'Code';

export type { CodeRootProps as CodeProps };
export const Code = assembleCompound('Code', Root, {});
