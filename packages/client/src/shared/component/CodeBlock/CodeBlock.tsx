import { useState } from "react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import { createTextClipboardPort } from "./shared";
import styles from "./CodeBlock.module.css";
import { IconButton } from "#component/IconButton";
import { Icon } from "#component/Icon";

/** 정규식 하나로 가르는 근사 강조다 — 파서가 아니라 언어를 가리지 않는다. */
type CodeBlockSyntaxTokenKind = "plain" | "keyword" | "string" | "comment" | "number" | "function" | "punctuation";

/** `key`는 React 목록용이라 같은 줄 안에서만 고유하면 된다. */
interface CodeBlockSyntaxToken {
  readonly key: string;
  readonly kind: CodeBlockSyntaxTokenKind;
  readonly text: string;
}

/** `number`는 1부터다. 빈 줄은 `text`가 공백 하나라 높이가 무너지지 않는다. */
export interface CodeBlockLine {
  readonly key: string;
  readonly number: number;
  readonly text: string;
  readonly tokens: readonly CodeBlockSyntaxToken[];
}

const SYNTAX_PATTERN =
  /(\/\/.*$|\/\*[\s\S]*?\*\/|`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\b(?:const|let|var|type|interface|export|import|from|return|function|class|extends|readonly|new|if|else|for|while|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()|[{}()[\].,;:<>/=+\-*])/gmu;

/** 끝의 줄바꿈 **하나만** 떼어낸다 — 펜스 코드가 늘 달고 오는 것이라 빈 줄로 보이면 안 된다. */
const normalizeContent = (value: string) => String(value).replace(/\n$/u, "");
/** 비었거나 공백뿐이면 `'text'`다 — 캡션이 빈 이름표를 그리지 않게. */
const normalizeLanguage = (value?: string) => value?.trim().toLowerCase() || "text";
/** 없으면 빈 문자열이다. 캡션을 그릴지 말지는 부르는 쪽이 이 값으로 정한다. */
const normalizeFileName = (value?: string) => value?.trim() ?? "";

/**
 * 복사 버튼의 접근성 이름. prop 으로 열어 두던 것(`copyLabel`·`copiedLabel`)을 상수로 내렸다
 * (2026-09-18) — 바깥에서 바꿀 일이 없었고 인터페이스만 넓혔다.
 */
const COPY_LABEL = "Copy code";
const COPIED_LABEL = "Copied";

const getSyntaxTokenKind = (text: string): CodeBlockSyntaxTokenKind => {
  if (text.startsWith("//") || text.startsWith("/*")) return "comment";
  if (text.startsWith("`") || text.startsWith('"') || text.startsWith("'")) return "string";
  if (/^\d/u.test(text)) return "number";
  if (/^[{}()[\].,;:<>/=+\-*]$/u.test(text)) return "punctuation";
  if (
    /^(const|let|var|type|interface|export|import|from|return|function|class|extends|readonly|new|if|else|for|while|true|false|null|undefined)$/u.test(
      text,
    )
  )
    return "keyword";
  return "function";
};

const tokenizeLine = (line: string, lineNumber: number): CodeBlockSyntaxToken[] => {
  const tokens: CodeBlockSyntaxToken[] = [];
  let cursor = 0;

  for (const match of line.matchAll(SYNTAX_PATTERN)) {
    const text = match[0];
    const index = match.index ?? 0;

    if (index > cursor)
      tokens.push({
        key: `${lineNumber}:${cursor}:plain`,
        kind: "plain",
        text: line.slice(cursor, index),
      });
    tokens.push({
      key: `${lineNumber}:${index}:${text}`,
      kind: getSyntaxTokenKind(text),
      text,
    });
    cursor = index + text.length;
  }

  if (cursor < line.length)
    tokens.push({
      key: `${lineNumber}:${cursor}:plain`,
      kind: "plain",
      text: line.slice(cursor),
    });
  if (tokens.length === 0)
    tokens.push({
      key: `${lineNumber}:0:plain`,
      kind: "plain",
      text: line || " ",
    });

  return tokens;
};

/** 줄 단위로 잘라 각 줄을 따로 토큰화한다 — 여러 줄 주석은 줄을 넘어 이어지지 않는다. */
const getLines = (content: string): CodeBlockLine[] =>
  content.split("\n").map((text, index) => {
    const number = index + 1;
    return {
      key: `${number}:${text}`,
      number,
      text: text || " ",
      tokens: tokenizeLine(text, number),
    };
  });

const COPY_RESET_DELAY_MS = 1400;

// 상태가 없어 컴포넌트마다 만들 이유가 없다 — `shared.ts`의 팩토리를 모듈 스코프에서 한 번만 부른다.
const clipboard = createTextClipboardPort();

/** `children`을 막는다 — 코드는 `content`로만 들어온다. */
export interface CodeBlockProps extends Omit<ComponentPropsWithoutRef<"figure">, "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 표시할 코드 원문. */
  readonly content: string;
  /** 캡션에 표시할 언어 이름표(예: `'typescript'`) — 문법 강조 자체와는 무관하다. */
  readonly language?: string;
  /** 캡션에 언어 옆에 적히는 파일 이름(예: `'index.ts'`). */
  readonly fileName?: string;
}

/**
 * 토큰 종류를 클래스로 갈라 받지 않고 `data-token` 으로 드러낸다 — 종류마다 어느 색을 쓸지는
 * 스타일 결정이라 CSS 가 `[data-token=…]` 로 받는다.
 */
export const CodeBlock = ({ content, language, fileName, className, ref, ...props }: CodeBlockProps) => {
  // 복사됨은 이 컴포넌트가 스스로 쥔다 — 바깥이 "복사됨"을 띄울 일이 없어 prop 으로 열지 않는다(2026-09-18 결정).
  const [copied, setCopied] = useState(false);

  const normalizedContent = normalizeContent(content);
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedFileName = normalizeFileName(fileName);
  const lines = getLines(normalizedContent);

  const copyCode = async () => {
    // 복사에 실패하면 "복사됨"을 띄우지 않는다 — 클립보드가 없는 환경은 예외가 아니라 정상 경로다.
    if (!(await clipboard.copy(normalizedContent))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
  };

  return (
    <figure ref={ref} {...props} data-component="CodeBlock" className={clsx(className, styles["root"])}>
      <figcaption className={styles["caption"]}>
        <span className={styles["meta"]}>
          <span className={styles["language"]}>{normalizedLanguage}</span>
          {normalizedFileName ? <span className={styles["fileName"]}>{normalizedFileName}</span> : null}
        </span>
        <IconButton
          variant="invisible"
          size="small"
          onClick={() => void copyCode()}
          aria-label={copied ? COPIED_LABEL : COPY_LABEL}
          icon={() => <Icon iconId={copied ? "check" : "copy"} size="sm" />}
        />
      </figcaption>
      <pre className={styles["body"]} data-language={normalizedLanguage}>
        {/* 브라우저 기본 스타일이 `code` 에 `font-family: monospace` 를 직접 걸어 `pre` 의 서체가 상속되지 않는다 — 되받는다. */}
        <code className={styles["code"]}>
          {lines.map((line) => (
            <span key={line.key} className={styles["line"]}>
              <span className={styles["lineNumber"]} aria-hidden="true">
                {line.number}
              </span>
              <span className={styles["lineText"]}>
                {line.tokens.map((token) => (
                  <span key={token.key} className={styles["token"]} data-token={token.kind}>
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
};
