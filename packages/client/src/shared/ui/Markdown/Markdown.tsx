import { memo } from "react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./Markdown.module.css";
import { CodeBlock } from "#ui/CodeBlock";

type MarkdownComponents = NonNullable<ComponentPropsWithoutRef<typeof ReactMarkdown>["components"]>;

export interface MarkdownProps extends ComponentPropsWithoutRef<"div"> {
  readonly ref?: Ref<HTMLElement>;
  readonly source: string;
}

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

export const Markdown = memo(({ source, className, ref, ...props }: MarkdownProps) => (
  <div
    ref={ref as Ref<HTMLDivElement>}
    {...props}
    data-component="Markdown"
    className={clsx(className, styles["root"])}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={CODE_COMPONENTS}>
      {source}
    </ReactMarkdown>
  </div>
));
