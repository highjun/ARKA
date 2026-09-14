import type { HTMLAttributes, Ref } from "react";
import { clsx } from "clsx";
import styles from "./DiffView.module.css";

/** 줄이 무엇인가. 색은 CSS가 이 값으로 고른다. */
export type DiffLineKind = "add" | "del" | "hunk" | "meta" | "ctx";

/** `children`을 막는다 — 내용은 `text`가 정한다. */
export interface DiffViewProps extends Omit<HTMLAttributes<HTMLPreElement>, "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLPreElement>;
  /** unified diff 원문. 줄 단위로 갈라 그린다. */
  readonly text: string;
}

/**
 * 줄 머리 글자로 종류를 가린다 — 파서가 아니라 접두만 본다. `+++`/`---`를 `+`/`-`보다 먼저
 * 보는 순서가 중요하다(파일 머리가 추가·삭제 줄로 보이면 안 된다).
 */
export const diffLineKindOf = (line: string): DiffLineKind => {
  if (line.startsWith("+++") || line.startsWith("---")) return "meta";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  if (line.startsWith("diff ") || line.startsWith("index ")) return "meta";
  return "ctx";
};

/**
 * unified diff를 줄 단위로 색만 칠해 보여 준다 — 나란히 보기는 에디터가 diff를 받을 때다.
 *
 * 종류를 클래스로 가르지 않고 `data-kind`로 드러낸다 — 어느 색을 쓸지는 스타일 결정이다
 * (→ ADR 0008).
 */
export const DiffView = ({ text, className, ref, ...props }: DiffViewProps) => (
  <pre ref={ref} {...props} data-component="DiffView" className={clsx(className, styles["root"])}>
    {text.split("\n").map((line, index) => (
      // 줄은 순서가 곧 신원이다 — 같은 내용의 줄이 여러 번 나오므로 내용으로 key를 만들 수 없다.
      <span key={index} className={styles["line"]} data-kind={diffLineKindOf(line)}>
        {line}
        {"\n"}
      </span>
    ))}
  </pre>
);
