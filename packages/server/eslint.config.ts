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
            { 
              target: "./src", 
              from: "../client/src", 
              message: "server는 client를 import할 수 없습니다. 공유할 코드는 contracts로 옮기고 `#contracts`로 가져오세요." 
            },
          ],
        },
      ],
    },
  },
];
