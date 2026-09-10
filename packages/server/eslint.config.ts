import ops from "ops/eslint";

/**
 * 서버의 구조 규칙. 계층 방향(`transport → services → domain ← infra`)과 feature 경계를 본다
 * (→ ADR 0007). 계층 글롭은 `features/*`라 **feature가 늘어도 설정을 안 건드린다.**
 */
export default [
  ...ops.configs.base,

  {
    // infra/는 I/O 구현이다 — 화면을 그리지 않는다.
    files: ["src/**/infra/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "react", message: "infra/는 React를 모릅니다." }, { name: "react-dom", message: "infra/는 React를 모릅니다." }] },
      ],
    },
  },

  {
    files: ["src/**/*.ts"],
    rules: { "arka/file-names": "error" },
  },

  {
    // 슬라이스 형제 금지. `roots`는 `context.cwd`(= 이 패키지) 기준이다.
    files: ["src/features/**/*.ts"],
    rules: { "arka/slices-are-siblings": ["error", { roots: ["src/features"] }] },
  },

  {
    files: ["src/**/*.ts", "*.config.ts"],
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // 서버 계층 방향. `Transport → Runtime/Services → Domain ← Infra`.
            {
              target: "./src/features/*/domain",
              from: ["./src/features/*/infra", "./src/features/*/runtime", "./src/features/*/services", "./src/features/*/transport"],
              message: "domain은 바깥을 모릅니다. 필요한 것은 domain이 인터페이스로 선언하고 infra가 구현하게 하세요.",
            },
            {
              target: "./src/features/*/infra",
              from: ["./src/features/*/runtime", "./src/features/*/services", "./src/features/*/transport"],
              message: "infra는 runtime·transport를 모릅니다. 의존은 안쪽(domain)을 향합니다.",
            },
            {
              target: ["./src/features/*/runtime", "./src/features/*/services"],
              from: "./src/features/*/transport",
              message: "runtime·services는 transport를 모릅니다. 어느 구현이 꽂힐지는 조립부(app.ts)가 정합니다.",
            },
            // server는 client를 모른다(→ ADR 0001). `no-restricted-imports`가 아니라 zone인 것은
            // 그 규칙을 계층별로 이미 쓰기 때문이다 — 겹치면 나중 블록이 앞의 것을 덮는다.
            { target: "./src", from: "../client/src", message: "server는 client를 import할 수 없습니다. 공유할 코드는 contracts로 옮기고 `#contracts`로 가져오세요." },
          ],
        },
      ],
    },
  },
];
