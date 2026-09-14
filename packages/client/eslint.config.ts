import reactHooks from "eslint-plugin-react-hooks";
import ops from "ops/lint";

/**
 * 클라이언트의 린트 설정.
 */
export default [
  ...ops.configs.base,

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

  {
    // Primer `IconButton`을 직접 가져오면 터치 최소 타겟 CSS를 잃는다(→ ADR 0009). 여기서만
    // `no-restricted-imports`를 쓰는 이유는 막을 것이 모듈 이름이 아니라 **가져오는 이름**이고
    // `importNames`가 별칭(`IconButton as PrimerIconButton`)까지 잡기 때문이다. 그 겹 자신은
    // 가져와야 하므로 `ignores`로 대상에서 뺀다 — 규칙을 끄는 것이 아니다.
    files: ["src/**/*.{ts,tsx}"],
    // `ModeToggle`은 겹을 쓰면 자기 `data-component`를 잃는다(→ TASK-64). 그때까지만 예외다.
    ignores: ["src/shared/component/IconButton/**", "src/shared/component/ModeToggle/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@primer/react",
              importNames: ["IconButton"],
              message: "`#component/IconButton`으로 가져오세요 — 터치 환경의 최소 타겟 CSS가 그 겹에만 있습니다.",
            },
          ],
        },
      ],
    },
  },
];
