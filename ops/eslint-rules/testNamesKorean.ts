import type { Rule } from "eslint";

const HANGUL = /[ㄱ-ㆎ가-힣]/u;
const TEST_CALLEES = new Set(["it", "test"]);

/** `it(...)`, `it.each(...)(...)`, `it.only(...)`의 이름 인자를 찾는다 — 첫 인자가 문자열/템플릿일 때만. */
const nameArgOf = (node: Rule.Node & { type: "CallExpression" }): (Rule.Node & { type: "Literal" | "TemplateLiteral" }) | null => {
  const callee = node.callee;
  const isTestCallee =
    (callee.type === "Identifier" && TEST_CALLEES.has(callee.name)) ||
    (callee.type === "MemberExpression" && callee.object.type === "Identifier" && TEST_CALLEES.has(callee.object.name)) ||
    // `it.each([...])('이름', fn)` — callee가 CallExpression이고 그 callee가 it.each
    (callee.type === "CallExpression" && callee.callee.type === "MemberExpression" && callee.callee.object.type === "Identifier" && TEST_CALLEES.has(callee.callee.object.name));
  if (!isTestCallee) return null;
  const first = node.arguments[0];
  if (first === undefined) return null;
  if (first.type === "Literal" && typeof first.value === "string") return first as Rule.Node & { type: "Literal" };
  if (first.type === "TemplateLiteral") return first as Rule.Node & { type: "TemplateLiteral" };
  return null;
};

const textOf = (node: Rule.Node & { type: "Literal" | "TemplateLiteral" }): string =>
  node.type === "Literal" ? String(node.value) : node.quasis.map((q) => q.value.cooked ?? q.value.raw).join(" ");

/**
 * `it()`/`test()` 이름은 한글 문장이다(→ ADR 0008). `describe`는 대상 식별자라 대상이 아니다.
 *
 * 판정은 "한글이 하나라도 있는가"다 — 식별자(`onValueChange`, `data-token`)가 섞인 한글 문장은 통과하고,
 * 영문만 있는 문장은 걸린다.
 */
export const testNamesKorean: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "it()/test() 이름은 한글로 쓴다" },
    messages: { notKorean: "테스트 이름은 동작을 서술하는 한글 문장으로 씁니다 — '없는 파일을 읽으면 NotFound를 던진다'처럼. 식별자는 그대로 섞어도 됩니다." },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const name = nameArgOf(node as Rule.Node & { type: "CallExpression" });
        if (name === null) return;
        if (HANGUL.test(textOf(name))) return;
        context.report({ node: name, messageId: "notKorean" });
      },
    };
  },
};
