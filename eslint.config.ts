import json from "@eslint/json";
import type { Linter } from "eslint";

/**
 * **저장소 루트의 파일을 검사한다.** 패키지는 각자 자기 `eslint.config.ts`가 본다.
 */
export default [
  { ignores: ["packages/**", "ops/**", "docs/**", "node_modules/**", ".output/**", ".claude/**"] },
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
];
