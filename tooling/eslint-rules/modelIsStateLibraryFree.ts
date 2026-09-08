import type { Rule } from "eslint";

/**
 * Model이 알면 안 되는 것들 — 화면 상태 라이브러리와 React.
 *
 * 우리가 쓰는 것(`nanostores`)만 막으면 다음 사람이 다른 것을 들여올 때 조용히 통과한다.
 * 잡으려는 것은 특정 라이브러리가 아니라 "Model이 화면 상태를 소유하는 것"이라, 같은 부류를
 * 함께 적는다.
 */
const FORBIDDEN_MODULES = new Set([
  "nanostores",
  "mobx",
  "mobx-react-lite",
  "jotai",
  "zustand",
  "redux",
  "@reduxjs/toolkit",
  "react-redux",
  "valtio",
  "recoil",
  "react",
  "react-dom",
]);

/**
 * `model/`은 상태 라이브러리도 React도 모른다.
 *
 * **왜**: Model이 atom을 들면 두 가지가 무너진다. 첫째, 계약(`IXModel`)이 `ReadableAtom`을
 * 노출하게 되어 상태 라이브러리를 갈아끼울 수 없다. 둘째, 화면 상태의 소유자가 Model과
 * ViewModel 둘로 갈라져 "이 값은 누가 바꾸나"가 흐려진다.
 *
 * Model은 **사실과 사건**을 다룬다 — 값은 getter로 주고 변화는 `onDidChange` 이벤트로 알린다.
 * atom을 갖는 건 ViewModel의 일이다.
 *
 * 흡수해 온 코드가 정확히 이걸 어기고 있었다(계약까지 `ReadableAtom`을 노출했다). 사람이
 * 리뷰로 잡는 대신 규칙으로 고정한다.
 */
export const modelIsStateLibraryFree: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "model/은 상태 라이브러리와 React를 모른다" },
    messages: {
      forbidden:
        "`model/`은 `{{name}}`을 import할 수 없습니다 — Model은 값과 이벤트(`onDidChange`)만 내고, 화면 상태(atom)는 ViewModel이 소유합니다.",
    },
    schema: [],
  },
  create(context) {
    const report = (node: Rule.Node, name: string): void => {
      const root = name.split("/")[0] ?? name;
      if (!FORBIDDEN_MODULES.has(root)) return;
      context.report({ node, messageId: "forbidden", data: { name: root } });
    };

    return {
      ImportDeclaration(node) {
        // `import type`은 컴파일에서 완전히 지워져 런타임 결합을 만들지 않는다. 잡으려는 것은
        // "Model이 atom을 들고 화면 상태를 소유하는 것"이지 타입 참조가 아니다.
        // (레지스트리가 `ComponentType`을 타입으로만 참조하는 것이 그 예다.)
        // estree 타입에는 없는 TS 확장 필드다 — 파서(typescript-eslint)가 채워 준다.
        if ((node as { importKind?: string }).importKind === "type") return;
        report(node as unknown as Rule.Node, String(node.source.value));
      },
    };
  },
};
