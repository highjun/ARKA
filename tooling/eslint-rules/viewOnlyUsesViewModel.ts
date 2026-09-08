import type { Rule } from "eslint";

/** DI 컨테이너에 직접 닿는 이름 — `useViewModel`을 통하지 않고 값을 얻는 통로. */
const DI_ACCESSORS = new Set(["useAppContext"]);

/**
 * `view/`가 부를 수 있는 훅은 `useViewModel` 하나뿐이다.
 *
 * **왜**: 상태는 전부 ViewModel이 들고 View는 반영만 한다. `useState`/`useEffect`를 View에
 * 허용하면 화면 상태의 소유자가 둘로 갈라지고, 그 순간 ViewModel 계약만 읽어서는 화면이
 * 무엇을 하는지 알 수 없게 된다 — 계약 우선 리뷰가 성립하지 않는다.
 *
 * DI 접근(`useAppContext`, `container.resolve`)도 막는다. 그걸 열어두면 View가 어떤 것이든
 * 꺼내 쓸 수 있어 의존이 계약에 드러나지 않는다.
 *
 * 조립 루트(`app/`)는 대상 글롭에 안 걸리므로 예외를 따로 두지 않는다 — 전역 배선은 거기
 * 모이고, 그 파일은 View가 아니다.
 */
export const viewOnlyUsesViewModel: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "View는 useViewModel만 부른다" },
    messages: {
      hookNotAllowed:
        "`{{name}}`은 여기서 쓸 수 없습니다 — view/가 부르는 훅은 `useViewModel` 하나뿐입니다. 로컬 상태가 필요하면 ViewModel로 옮기세요.",
      diAccessNotAllowed:
        "DI 접근(`{{name}}`)은 `useViewModel`을 통해서만 합니다 — 직접 부르지 마세요.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier") return;
        const name = callee.name;
        if (name === "useViewModel") return;
        if (DI_ACCESSORS.has(name)) {
          context.report({ node, messageId: "diAccessNotAllowed", data: { name } });
          return;
        }
        if (/^use[A-Z]/u.test(name)) {
          context.report({ node, messageId: "hookNotAllowed", data: { name } });
        }
      },
      MemberExpression(node) {
        if (node.property.type !== "Identifier" || node.property.name !== "resolve") return;
        if (node.object.type !== "Identifier") return;
        if (!/^(?:container|ctx|context)$|Context$/u.test(node.object.name)) return;
        context.report({ node, messageId: "diAccessNotAllowed", data: { name: "resolve" } });
      },
    };
  },
};
