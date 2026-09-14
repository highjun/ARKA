import { memo } from "react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./Markdown.module.css";
import { CodeBlock } from "#component/CodeBlock";

/** 요소별 덮어쓰기 맵 — react-markdown의 `components`를 그대로 받는다. */
type MarkdownComponents = NonNullable<ComponentPropsWithoutRef<typeof ReactMarkdown>["components"]>;

/** 원문을 받는다 — 파싱과 렌더는 이 컴포넌트가 한다. */
export interface MarkdownProps extends ComponentPropsWithoutRef<"div"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 마크다운 원문. */
  readonly source: string;
  /**
   * 요소를 바꿔 끼우는 자리. 링크를 눌렀을 때 워크스페이스에서 열기처럼 **앱이 아는 동작**을
   * 여기로 꽂는다. 기본 맵(코드 블록)과 얕게 합쳐지므로 넘긴 것만 덮인다.
   */
  readonly components?: MarkdownComponents;
}

/**
 * 펜스 코드 블록만 컴포넌트로 바꾼다 — 복사 버튼과 줄 번호가 거기 있다.
 *
 * `code` 요소는 인라인과 블록 둘 다로 온다. react-markdown 10은 인라인에 `className`을 주지
 * 않으므로 `language-` 접두 유무로 가른다. 언어를 적지 않은 펜스도 인라인과 구별되지 않아
 * 인라인으로 그려진다 — 언어를 적는 것이 코드 블록을 얻는 조건이다.
 *
 * `pre`를 그대로 통과시키는 것은 `CodeBlock`이 자기 `figure`를 내기 때문이다. 안 그러면
 * `pre` 안에 `figure`가 들어가 문서 구조가 어긋난다.
 */
const CODE_COMPONENTS: MarkdownComponents = {
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...props }) => {
    const language = /language-(\w+)/u.exec(className ?? "")?.[1];

    if (language === undefined) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    return <CodeBlock content={String(children)} language={language} />;
  },
};

/**
 * 마크다운을 React 요소로 그린다. 원문 HTML은 켜지 않는다 — 그래서 정화기가 필요 없고,
 * `<script>`가 든 문서도 글자로만 남는다(→ ADR 0009).
 *
 * 메시지마다 다시 파싱하는 비용은 `memo`로 막는다 — 스트리밍 중에는 마지막 메시지만 바뀐다.
 *
 * 루트는 `div`다. 메시지 말풍선(`article`) 안에 들어가는 쓰임이 있어서 `article`을 내면 중첩된다.
 */
export const Markdown = memo(({ source, components, className, ref, ...props }: MarkdownProps) => (
  <div
    ref={ref as Ref<HTMLDivElement>}
    {...props}
    data-component="Markdown"
    className={clsx(className, styles["root"])}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...CODE_COMPONENTS, ...components }}>
      {source}
    </ReactMarkdown>
  </div>
));
