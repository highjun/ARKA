import ops from "ops/lint";

/**
 * 서버의 린트 설정.
 *
 * **계층 방향 규칙이 지금 비어 있다.** `docs/legacy/code/`로 옮겨 껐다 — 서버 구조 ADR이 아직
 * 새 번호로 옮겨지지 않아서다. 남은 zone은 [ADR 0001](../../docs/adr/0001-monorepo-pnpm.md)의 것뿐이다.
 */
export default [
  ...ops.configs.base,

  {
    files: ["src/**/*.ts", "*.config.ts", "build.ts"],
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            { target: "./src", from: "../client/src", message: "server는 client를 import할 수 없습니다. 공유할 코드는 contracts로 옮기고 `#contracts`로 가져오세요." },
          ],
        },
      ],
    },
  },
];
