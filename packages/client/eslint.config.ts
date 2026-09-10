import reactHooks from "eslint-plugin-react-hooks";
import ops, { requireJsdoc } from "ops/lint";

/**
 * 클라이언트의 린트 설정.
 */
export default [
  ...ops.configs.base,

  {
    // **공개 면에 문서가 필수다**(→ ADR 0004). 계층마다 위반이 0이 되는 대로 이 목록을 넓힌다 —
    // 남은 곳은 `extensions`(185) · `workbench`(98)다.
    files: ["src/core/**/*.{ts,tsx}", "src/shared/**/*.{ts,tsx}"],
    rules: { "jsdoc/require-jsdoc": requireJsdoc },
  },

  {
    // 훅 규칙. 의존성 배열을 일부러 좁힌 자리(CodeMirror 에디터)를 eslint-disable로 여는데,
    // 플러그인이 없으면 그 주석 자체가 에러가 된다.
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" },
  },

  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.ts", ".storybook/*.{ts,tsx}", "*.config.ts"],
    rules: {
      // **`#contracts`로 가져온다**(→ ADR 0001). 맨이름 `"contracts"`는 서드파티와 구분되지 않는다.
      // `import-x`로는 못 한다 — 둘이 같은 파일로 풀려 구분이 사라진다. 문자열을 보는 코어 규칙이라야 갈린다.
      // `no-restricted-imports`는 **동적 `import()`를 놓치고**(2026-09-10 실측), 계층 규칙과 이름이
      // 겹쳐 나중 블록이 앞의 것을 덮는다(2026-09-09에 겪음). 그래서 선택자가 형태별로 넷이다.
      "no-restricted-syntax": [
        "error",
        ...(["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration", "ImportExpression"].map(
          (node) => ({
            selector: `${node}[source.value=/^contracts(\\/|$)/]`,
            message: "`#contracts`로 가져오세요 — 맨이름은 서드파티와 구분되지 않습니다.",
          }),
        )),
      ],
      // 다른 패키지를 상대경로로 가져오는 것(`../../contracts/src/…`). 해석에 기대므로 바탕의
      // 리졸버가 서야 한다. `no-internal-modules`는 쓰지 않는다 — `#contracts`·`#core/di` 같은
      // 서브패스 import를 전부 위반으로 보고, 위 정규식이 `contracts/*`를 이미 덮는다.
      "import-x/no-relative-packages": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            { target: "./src", from: "../server/src", message: "client는 server를 import할 수 없습니다. 공유할 코드는 contracts로 옮기고 `#contracts`로 가져오세요." },
          ],
        },
      ],
    },
  },
];
