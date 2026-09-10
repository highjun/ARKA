import reactHooks from "eslint-plugin-react-hooks";
import ops from "ops/lint";

/**
 * 클라이언트의 린트 설정.
 *
 * **구조 규칙이 지금 비어 있다.** 계층 금지(`model/`의 전역, `component/`의 DI, `view/`의 훅…)와
 * 슬라이스 방향을 강제하던 것들은 `docs/legacy/code/`로 옮겨 껐다 — 그 규칙을 낳은 ADR이 아직
 * 새 번호로 옮겨지지 않아서다. 클라이언트 구조 ADR이 재작성될 때 함께 돌아온다.
 *
 * 남은 zone은 [ADR 0001](../../docs/adr/0001-monorepo-pnpm.md)의 것 하나뿐이다.
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
      // client는 server를 모른다. 공유할 코드는 contracts로 옮기고 `#contracts`로 가져온다.
      // **`no-restricted-imports`로 쓰지 않는다** — 그 규칙은 계층별로도 쓰이는 이름이라, 같은
      // 파일에 둘이 걸리면 나중 블록이 앞의 것을 통째로 덮는다(2026-09-09에 실제로 겪음).
      // **`#contracts`로 가져온다**(→ ADR 0001). 맨이름 `"contracts"`는 서드파티와 구분되지 않는다.
      //
      // `import-x` 규칙으로는 못 한다 — 그것들은 import를 파일 경로로 **해석**하는데
      // `"contracts"`와 `"#contracts"`가 같은 파일로 풀려 구분이 사라진다. 문자열을 보는
      // 코어 규칙이라야 갈린다.
      //
      // 선택자가 넷인 것은 형태가 넷이기 때문이다. `no-restricted-imports`도 되지만 **동적
      // `import()`를 놓친다**(2026-09-10 실측).
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
