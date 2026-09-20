import type { AST, Rule } from "eslint";

/** 도구가 읽는 지시문. 주석이 아니라 명령이라 길이를 세지 않는다. */
const DIRECTIVE = /^\s*(eslint|@ts-|prettier-|istanbul |c8 |v8 |\/)/u;

/** 느낌표로 시작하는 라이선스 헤더. 번들러가 보존하는 관례라 손대지 않는다. */
const LICENSE = /^!/u;

/** `@example` 구간은 코드 블록이라 설명 분량으로 세지 않는다. */
const countTsdocLines = (value: string): number => {
  let inExample = false;
  let n = 0;
  for (const raw of value.split("\n")) {
    const line = raw.replace(/^\s*\*\s?/u, "").trim();
    if (/^@example\b/u.test(line)) {
      inExample = true;
      continue;
    }
    if (inExample && /^@\w/u.test(line)) inExample = false;
    if (inExample || line === "") continue;
    n += 1;
  }
  return n;
};

type Options = { readonly line: number; readonly block: number; readonly tsdoc: number };

const DEFAULTS: Options = { line: 4, block: 4, tsdoc: 10 };

/**
 * 주석이 길어지면 코드가 아니라 문서다 — 문서로 옮기고 링크만 남긴다.
 *
 * 세 가지를 따로 센다. 연속된 `//`는 빈 줄이나 코드가 끼면 묶음이 끊긴다. TSDoc은 `@example`
 * 구간과 빈 줄을 뺀 **내용 줄**만 센다 — 예제 코드까지 세면 좋은 예제가 벌을 받는다.
 */
export const maxCommentLines: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "주석 한 덩어리의 줄 수를 제한한다" },
    messages: {
      tooLong: "{{kind}} 주석이 {{actual}}줄입니다(상한 {{max}}). 배경 설명은 `docs/`로 옮기고 링크만 남기세요.",
    },
    schema: [
      {
        type: "object",
        properties: {
          line: { type: "integer", minimum: 1 },
          block: { type: "integer", minimum: 1 },
          tsdoc: { type: "integer", minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const opts: Options = { ...DEFAULTS, ...(context.options[0] as Partial<Options> | undefined) };
    const report = (loc: AST.SourceLocation, kind: string, actual: number, max: number): void => {
      context.report({ loc, messageId: "tooLong", data: { kind, actual: String(actual), max: String(max) } });
    };

    return {
      Program(): void {
        // `loc`이 없는 주석은 자리를 짚을 수 없어 보고할 수 없다 — 세지도 않는다.
        const comments = context.sourceCode
          .getAllComments()
          .flatMap((c) => (c.loc == null ? [] : [{ value: c.value, isLine: c.type === "Line", loc: c.loc }]));

        let run: typeof comments = [];

        const flushRun = (): void => {
          const first = run[0];
          if (first !== undefined && run.length > opts.line) report(first.loc, "연속된 `//`", run.length, opts.line);
          run = [];
        };

        for (const comment of comments) {
          if (DIRECTIVE.test(comment.value)) {
            flushRun();
            continue;
          }

          if (comment.isLine) {
            const previous = run.at(-1);
            // 바로 윗줄의 `//`여야 같은 묶음이다 — 빈 줄이나 코드가 끼면 새 묶음으로 센다.
            if (previous !== undefined && comment.loc.start.line !== previous.loc.end.line + 1) flushRun();
            run.push(comment);
            continue;
          }

          flushRun();
          if (LICENSE.test(comment.value)) continue;

          if (comment.value.startsWith("*")) {
            const lines = countTsdocLines(comment.value);
            if (lines > opts.tsdoc) report(comment.loc, "TSDoc", lines, opts.tsdoc);
            continue;
          }
          // 블록도 TSDoc과 같은 기준으로 센다 — `/*`·`*/` 줄과 빈 줄은 내용이 아니다.
          const lines = countTsdocLines(comment.value);
          if (lines > opts.block) report(comment.loc, "블록", lines, opts.block);
        }

        flushRun();
      },
    };
  },
};
