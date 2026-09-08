import { mergeClassNames } from '#utils/mergeClassNames';
import type { HTMLAttributes } from 'react';
import styles from './MarkdownPreview.module.css';
import { renderMarkdown } from './renderMarkdown';

export interface MarkdownPreviewProps extends HTMLAttributes<HTMLElement> {
  readonly markdown: string;
}

/** 마크다운 원문을 그린다. HTML은 `renderMarkdown`이 정화한 것만 넣는다. */
export const MarkdownPreview = ({ markdown, className, ...props }: MarkdownPreviewProps) => (
  // dangerouslySetInnerHTML: 정화된 HTML만 들어온다(renderMarkdown이 DOMPurify를 거친다).
  <article {...props} data-component="MarkdownPreview" className={mergeClassNames(className, styles['root'])} dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />
);
