import { forwardRef, useState } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import { createTextClipboardPort } from './shared';
import styles from './CodeBlock.module.css';
import { IconButton } from '@primer/react';
import { Icon } from '#components/common/Icon';

export type CodeBlockSyntaxTokenKind = 'plain' | 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'punctuation';

export interface CodeBlockSyntaxToken {
  readonly key: string;
  readonly kind: CodeBlockSyntaxTokenKind;
  readonly text: string;
}

export interface CodeBlockLine {
  readonly key: string;
  readonly number: number;
  readonly text: string;
  readonly tokens: readonly CodeBlockSyntaxToken[];
}

const SYNTAX_PATTERN =
  /(\/\/.*$|\/\*[\s\S]*?\*\/|`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\b(?:const|let|var|type|interface|export|import|from|return|function|class|extends|readonly|new|if|else|for|while|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()|[{}()[\].,;:<>/=+\-*])/gmu;

export const normalizeContent = (value: string) => String(value).replace(/\n$/u, '');
export const normalizeLanguage = (value?: string) => value?.trim().toLowerCase() || 'text';
export const normalizeTitle = (value?: string) => value?.trim() ?? '';

const getSyntaxTokenKind = (text: string): CodeBlockSyntaxTokenKind => {
  if (text.startsWith('//') || text.startsWith('/*')) return 'comment';
  if (text.startsWith('`') || text.startsWith('"') || text.startsWith("'")) return 'string';
  if (/^\d/u.test(text)) return 'number';
  if (/^[{}()[\].,;:<>/=+\-*]$/u.test(text)) return 'punctuation';
  if (
    /^(const|let|var|type|interface|export|import|from|return|function|class|extends|readonly|new|if|else|for|while|true|false|null|undefined)$/u.test(
      text,
    )
  )
    return 'keyword';
  return 'function';
};

const tokenizeLine = (line: string, lineNumber: number): CodeBlockSyntaxToken[] => {
  const tokens: CodeBlockSyntaxToken[] = [];
  let cursor = 0;

  for (const match of line.matchAll(SYNTAX_PATTERN)) {
    const text = match[0];
    const index = match.index ?? 0;

    if (index > cursor) tokens.push({ key: `${lineNumber}:${cursor}:plain`, kind: 'plain', text: line.slice(cursor, index) });
    tokens.push({ key: `${lineNumber}:${index}:${text}`, kind: getSyntaxTokenKind(text), text });
    cursor = index + text.length;
  }

  if (cursor < line.length) tokens.push({ key: `${lineNumber}:${cursor}:plain`, kind: 'plain', text: line.slice(cursor) });
  if (tokens.length === 0) tokens.push({ key: `${lineNumber}:0:plain`, kind: 'plain', text: line || ' ' });

  return tokens;
};

export const getLines = (content: string): CodeBlockLine[] =>
  content.split('\n').map((text, index) => {
    const number = index + 1;
    return { key: `${number}:${text}`, number, text: text || ' ', tokens: tokenizeLine(text, number) };
  });

const COPY_RESET_DELAY_MS = 1400;

// 상태가 없어 컴포넌트마다 만들 이유가 없다 — `shared.ts`의 팩토리를 모듈 스코프에서 한 번만 부른다.
const clipboard = createTextClipboardPort();

export interface CodeBlockRootProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  /** 표시할 코드 원문. */
  readonly content: string;
  /** 캡션에 표시할 언어 이름표(예: `'typescript'`) — 문법 강조 자체와는 무관하다. */
  readonly language?: string;
  /** 코드 캡션에 쓰는 파일명/제목 — 네이티브 `title`(툴팁)과 이름이 겹치지만, 캡션이 이 컴포넌트에서 더 흔한 쓰임이라 그대로 가져간다. */
  readonly title?: string;
  /** 복사 버튼의 접근성 이름(복사 전). 기본값 `'Copy code'`. */
  readonly copyLabel?: string;
  /** 복사 직후 잠깐 바뀌는 접근성 이름. 기본값 `'Copied'`. */
  readonly copiedLabel?: string;
}

/**
 * 토큰 종류를 클래스로 갈라 받지 않고 `data-token` 으로 드러낸다 — 종류마다 어느 색을 쓸지는
 * 스타일 결정이라 CSS 가 `[data-token=…]` 로 받는다.
 */
const Root = forwardRef<HTMLElement, CodeBlockRootProps>(
  (
    {
      content,
      language,
      title,
      className,
      copyLabel = 'Copy code',
      copiedLabel = 'Copied',
      ...props
    },
    ref,
  ) => {
    const [copied, setCopied] = useState(false);

    const normalizedContent = normalizeContent(content);
    const normalizedLanguage = normalizeLanguage(language);
    const normalizedTitle = normalizeTitle(title);
    const lines = getLines(normalizedContent);

    const copyCode = async () => {
      // 복사에 실패하면 "복사됨"을 띄우지 않는다 — 클립보드가 없는 환경은 예외가 아니라 정상 경로다.
      if (!(await clipboard.copy(normalizedContent))) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
    };

    return (
      <figure
        ref={ref}
        {...props}
        data-component="CodeBlock"
        className={clsx(className, styles['root'])}
      >
        <figcaption className={styles['caption']}>
          <span className={styles['meta']}>
            <span className={styles['language']}>{normalizedLanguage}</span>
            {normalizedTitle ? <span className={styles['title']}>{normalizedTitle}</span> : null}
          </span>
          <IconButton
            variant="invisible"
            size="small"
            onClick={copyCode}
            aria-label={copied ? copiedLabel : copyLabel}
            icon={() => <Icon iconId={copied ? 'check' : 'copy'} size="sm" />}
          />
        </figcaption>
        <pre className={styles['body']} data-language={normalizedLanguage}>
          <code>
            {lines.map((line) => (
              <span key={line.key} className={styles['line']}>
                <span className={styles['lineNumber']} aria-hidden="true">
                  {line.number}
                </span>
                <span className={styles['lineText']}>
                  {line.tokens.map((token) => (
                    <span key={token.key} className={styles['token']} data-token={token.kind}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </figure>
    );
  },
);
Root.displayName = 'CodeBlock';

export type { CodeBlockRootProps as CodeBlockProps };
export const CodeBlock = assembleCompound('CodeBlock', Root, {});
