import json from "@eslint/json";
import type { Linter } from "eslint";

/**
 * **저장소 루트의 파일을 검사한다.** 패키지는 각자 자기 `eslint.config.ts`가 본다.
 *
 * 이 파일이 루트에 있어야 하는 이유는 ESLint의 base path가 **설정 파일이 있는 디렉터리**이기
 * 때문이다(2026-09-10 실측). `ops/`에 두고 `--config`로 가리켜도 루트 파일은 "outside of base
 * path"로 건너뛴다. `basePath` 설정도 좁히기만 하고 넓히지 못한다.
 *
 * 실행체는 ops의 것을 빌린다 — `pnpm --filter ops run lint:root`. 그래서 루트
 * `devDependencies`는 비어 있는 채로 둔다.
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
