import { useState } from "react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import { createTextClipboardPort } from "./shared";
import styles from "./CodeBlock.module.css";
import { IconButton } from "#ui/IconButton";
import { Icon } from "#ui/Icon";

type CodeBlockSyntaxTokenKind = "plain" | "keyword" | "string" | "comment" | "number" | "function" | "punctuation";

interface CodeBlockSyntaxToken {
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

const normalizeContent = (value: string) => String(value).replace(/\n$/u, "");
const normalizeLanguage = (value?: string) => value?.trim().toLowerCase() || "text";
const normalizeFileName = (value?: string) => value?.trim() ?? "";

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

const clipboard = createTextClipboardPort();

export interface CodeBlockProps extends Omit<ComponentPropsWithoutRef<"figure">, "children"> {
  readonly ref?: Ref<HTMLElement>;
  readonly content: string;
  readonly language?: string;
  readonly fileName?: string;
}

export const CodeBlock = ({ content, language, fileName, className, ref, ...props }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const normalizedContent = normalizeContent(content);
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedFileName = normalizeFileName(fileName);
  const lines = getLines(normalizedContent);

  const copyCode = async () => {
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
