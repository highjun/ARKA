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
