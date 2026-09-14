import { createRuleTester } from "./ruleTester.ts";
import { maxCommentLines } from "./maxCommentLines.ts";

const lines = (n: number, text = "설명"): string =>
  Array.from({ length: n }, (_, i) => `// ${text} ${String(i)}`).join("\n");

const tsdoc = (n: number): string =>
  ["/**", ...Array.from({ length: n }, (_, i) => ` * 설명 ${String(i)}`), " */"].join("\n");

createRuleTester().run("max-comment-lines", maxCommentLines, {
  valid: [
    { name: "상한과 같은 연속 `//`", code: `${lines(4)}\nconst a = 1;` },
    { name: "빈 줄이 끼면 묶음이 끊긴다", code: `${lines(3)}\n\n${lines(3)}\nconst a = 1;` },
    { name: "코드가 끼면 묶음이 끊긴다", code: `${lines(3)}\nconst a = 1;\n${lines(3)}\nconst b = 2;` },
    { name: "상한과 같은 TSDoc", code: `${tsdoc(10)}\nconst a = 1;` },
    {
      name: "TSDoc의 빈 줄은 세지 않는다",
      code: "/**\n * 하나\n *\n *\n *\n *\n *\n *\n *\n *\n *\n *\n * 둘\n */\nconst a = 1;",
    },
    {
      name: "`@example` 구간은 세지 않는다",
      code: "/**\n * 설명.\n * @example\n * const a = 1;\n * const b = 2;\n * const c = 3;\n * const d = 4;\n * const e = 5;\n * const f = 6;\n * const g = 7;\n * const h = 8;\n * const i = 9;\n * const j = 10;\n */\nconst a = 1;",
    },
    {
      name: "지시문은 묶음을 끊고 세지 않는다",
      code: `${lines(3)}\n// eslint-disable-next-line no-undef -- 사유\n${lines(3)}\nconst a = 1;`,
    },
    {
      name: "긴 지시문 연속",
      code: "// @ts-expect-error 1\n// @ts-expect-error 2\n// @ts-expect-error 3\n// @ts-expect-error 4\n// @ts-expect-error 5\nconst a = 1;",
    },
    { name: "라이선스 헤더는 면제", code: "/*!\n * 1\n * 2\n * 3\n * 4\n * 5\n */\nconst a = 1;" },
    { name: "상한과 같은 블록 — 구분자 줄은 세지 않는다", code: "/*\n 1\n 2\n 3\n 4\n*/\nconst a = 1;" },
    { name: "옵션으로 상한을 올린다", code: `${lines(6)}\nconst a = 1;`, options: [{ line: 6 }] },
  ],
  invalid: [
    {
      name: "연속 `//` 다섯 줄",
      code: `${lines(5)}\nconst a = 1;`,
      errors: [{ messageId: "tooLong", data: { kind: "연속된 `//`", actual: "5", max: "4" } }],
    },
    {
      name: "TSDoc 열한 줄",
      code: `${tsdoc(11)}\nconst a = 1;`,
      errors: [{ messageId: "tooLong", data: { kind: "TSDoc", actual: "11", max: "10" } }],
    },
    {
      name: "블록 다섯 줄",
      code: "/*\n 1\n 2\n 3\n 4\n 5\n*/\nconst a = 1;",
      errors: [{ messageId: "tooLong", data: { kind: "블록", actual: "5", max: "4" } }],
    },
    {
      name: "`@example` 뒤에 태그가 오면 다시 센다",
      code: "/**\n * 1\n * @example\n * code\n * @returns 2\n * 3\n * 4\n * 5\n * 6\n * 7\n * 8\n * 9\n * 10\n * 11\n */\nconst a = 1;",
      errors: [{ messageId: "tooLong" }],
    },
    {
      name: "옵션으로 상한을 내린다",
      code: `${lines(3)}\nconst a = 1;`,
      options: [{ line: 2 }],
      errors: [{ messageId: "tooLong", data: { kind: "연속된 `//`", actual: "3", max: "2" } }],
    },
    {
      name: "한 파일에 여러 덩어리",
      code: `${lines(5)}\nconst a = 1;\n${lines(6)}\nconst b = 2;`,
      errors: [{ messageId: "tooLong" }, { messageId: "tooLong" }],
    },
  ],
});
