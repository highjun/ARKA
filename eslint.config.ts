import json from "@eslint/json";
import packageJson from "eslint-plugin-package-json";
import yml from "eslint-plugin-yml";
import type { Linter } from "eslint";

/**
 * **저장소 루트의 파일을 검사한다.** 패키지는 각자 자기 `eslint.config.ts`가 본다.
 *
 * 2026-09-14까지 여기가 보는 것은 `tsconfig*.json` 하나였다 — 루트 `package.json`,
 * `pnpm-workspace.yaml`, `.github/**`가 어느 글롭에도 안 걸렸다.
 *
 * 바탕(`ops/lint`)을 펴지 않는다. 루트 `package.json`에 의존성이 없어야 해서(→ ADR 0001)
 * `ops/lint`를 이름으로 가져올 수 없고, TS·JSX가 없는 자리라 바탕이 볼 것도 없다.
 */
export default [
  { ignores: ["packages/**", "ops/**", "docs/**", "node_modules/**", ".output/**", ".claude/**", "pnpm-lock.yaml"] },
  {
    // tsconfig는 주석이 있는 JSONC다.
    files: ["tsconfig*.json"],
    plugins: { json },
    language: "json/jsonc",
    rules: {
      // `paths` 별칭 금지(→ ADR 0001). tsc만 아는 별칭이라 타입 검사는 통과하는데 vitest·node가
      // 모듈을 못 찾는다. **루트의 것이 가장 파급이 크다** — 세 패키지가 전부 `extends` 한다.
      "no-restricted-syntax": [
        "error",
        {
          selector: 'Member[name.value="paths"]',
          message: "tsconfig paths 별칭을 쓰지 않습니다 — package.json의 imports 필드를 쓰세요.",
        },
      ],
    },
  } as unknown as Linter.Config,

  // 루트 `package.json`. 중복 선언·정렬·형태를 그 배포자의 플러그인이 본다(→ ADR 0011).
  packageJson.configs.recommended as unknown as Linter.Config,

  // 워크플로와 액션 YAML. **형태만 본다** — 없는 `uses`·잘못된 `needs` 같은 의미는
  // `actionlint`가 CI에서 본다(→ ADR 0005).
  ...(yml.configs["flat/standard"] as unknown as Linter.Config[]),
  // 여백·괄호 안 공백 같은 모양은 포매터의 일이다(TASK-65) — 여기서 다투지 않는다. 남는 것은
  // 빈 키·빈 값·탭 들여쓰기처럼 **뜻이 달라지는** 것들이다.
  ...(yml.configs["flat/prettier"] as unknown as Linter.Config[]),
  {
    files: ["**/*.{yml,yaml}"],
    // 따옴표를 뗄 수 있으면 떼라는 규칙. 한 목록 안에서 **섞인다** — `pnpm-workspace.yaml`의
    // `- "packages/*"`는 별표 때문에 따옴표가 필요하고 `- ops`는 아니라서, 두 줄이 서로 다른
    // 모양이 된다. 위쪽 문서(pnpm·GitHub)도 따옴표를 쓴다.
    rules: { "yml/plain-scalar": "off" },
  },
];
