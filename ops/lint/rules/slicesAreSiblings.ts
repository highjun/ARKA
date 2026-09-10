import path from "node:path";
import type { Rule } from "eslint";

type Options = { readonly roots?: readonly string[] };

/**
 * 같은 부모 아래의 슬라이스(클라이언트 `extensions/<a>`, 서버 `features/<a>`)는 서로를 import하지
 * 않는다. DI 토큰이나 이벤트로만 소통한다.
 *
 * **왜 커스텀 규칙인가**: `import-x/no-restricted-paths`는 "형제끼리 금지"를 한 줄로 못 쓴다.
 * 쌍마다 zone을 적어야 해서 셋이면 6쌍, 넷이면 12쌍이고, 하나를 빠뜨리면 조용히 통과한다 —
 * 실제로 `extensions/agent`가 두 번째 슬라이스인데 세 번째를 만들어 보니 0건으로 통과했다.
 * 경로에서 슬라이스 이름을 뽑아 비교하면 슬라이스를 추가해도 설정을 건드릴 일이 없다.
 *
 * 상대 경로만 본다. 패키지 안 별칭(`#core/*` 등)은 슬라이스를 가리키지 않는다(→ ADR 0012).
 */
export const slicesAreSiblings: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "슬라이스끼리 직접 import하지 않는다" },
    messages: {
      crossSlice:
        "`{{from}}`이 형제 슬라이스 `{{to}}`를 import했습니다 — 슬라이스끼리는 서로 모릅니다. 필요한 것은 DI 토큰이나 이벤트로 받고, 계약은 상위(workbench·core·contracts)에 선언하세요.",
    },
    schema: [
      {
        type: "object",
        properties: { roots: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options;
    const roots = (options.roots ?? []).map((root) => path.resolve(context.cwd, root));

    /** 이 절대경로가 어느 루트의 어느 슬라이스에 속하는지. 어느 루트에도 없으면 `null`. */
    const sliceOf = (absolute: string): { root: string; slice: string } | null => {
      for (const root of roots) {
        if (!absolute.startsWith(`${root}${path.sep}`)) continue;
        const slice = path.relative(root, absolute).split(path.sep)[0];
        if (slice !== undefined && slice !== "") return { root, slice };
      }
      return null;
    };

    const own = sliceOf(context.filename);
    if (own === null) return {};

    const check = (node: Rule.Node, source: unknown): void => {
      if (typeof source !== "string" || !source.startsWith(".")) return;
      const target = sliceOf(path.resolve(path.dirname(context.filename), source));
      if (target === null || target.root !== own.root || target.slice === own.slice) return;
      context.report({ node, messageId: "crossSlice", data: { from: own.slice, to: target.slice } });
    };

    return {
      ImportDeclaration(node) {
        check(node as unknown as Rule.Node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node as unknown as Rule.Node, node.source.value);
      },
      ExportAllDeclaration(node) {
        check(node as unknown as Rule.Node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal") check(node as unknown as Rule.Node, node.source.value);
      },
    };
  },
};
