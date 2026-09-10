import js from "@eslint/js";
import json from "@eslint/json";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import type { Linter } from "eslint";

import { FORBIDDEN_KEY, FORBIDDEN_MESSAGE } from "./tsconfigRules.ts";

/**
 * 이 저장소의 린트 바탕. **모든 패키지가 공유하는 것**만 든다.
 *
 * 각 패키지가 자기 `eslint.config.ts`를 갖는다 — 규칙의 대부분이 그 패키지 전용이기 때문이다.
 * 그런데 **중첩 설정은 병합이 아니라 대체**라(ESLint 10에서 실측), 패키지 설정이 생기는 순간
 * 바탕까지 함께 사라진다. 그래서 바탕을 여기서 내보내고 각 설정이 앞에 펼친다.
 *
 * ```ts
 * import ops from "ops/lint";
 * export default [...ops.configs.base, { files: ["src/**"], rules: { … } }];
 * ```
 *
 * **여기 있는 규칙은 전부 ADR이 든다.** 주인 없는 규칙은 끄고 `docs/legacy/code/`에 뒀다 —
 * 규칙은 결정이 낳는 것이라, 결정이 아직 재작성되지 않았으면 강제할 근거가 없다.
 */
const base: Linter.Config[] = [
  // 산출물은 검사하지 않는다 — 번들된 코드가 규칙에 걸려도 고칠 소스가 여기가 아니다.
  { ignores: ["**/node_modules/**", "**/dist/**", "**/storybook-static/**", "**/.output/**"] },

  // 플러그인은 **여기서 한 번만** 등록한다. 패키지 설정이 다시 등록하면 같은 이름에 다른
  // 객체가 걸려 `Cannot redefine plugin`으로 죽는다 — 정의는 배열 전체에 누적된다.
  { plugins: { "import-x": importX } },
  {
    // **선언하지 않은 것을 import하면 잡는다**(→ ADR 0003). Node와 ESLint의 해석기가
    // `node_modules`를 위로 걸어 올라가 저장소 루트에서 찾아 주기 때문에, 선언이 빠져도 조용히
    // 동작한다 — 이 규칙이 없으면 패키지가 스스로 설 수 있는지 아무도 모른다.
    files: ["**/*.{ts,tsx,js}"],
    rules: { "import-x/no-extraneous-dependencies": "error" },
  },

  {
    // **각 패키지의 `tsconfig.json`을 검사한다**(→ ADR 0001). 이 블록이 없으면 `eslint .`은
    // `.json`을 아예 집지 않는다. 주석이 있으므로 언어는 `json/jsonc`다. 금지 키와 메시지는
    // `tsconfigRules.ts`가 든다 — 루트를 보는 `rootConfig.test.ts`와 같은 것을 읽어야 한다.
    files: ["**/tsconfig*.json"],
    plugins: { json },
    language: "json/jsonc",
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Member[name.value="${FORBIDDEN_KEY}"]`, message: FORBIDDEN_MESSAGE },
      ],
    },
  } as unknown as Linter.Config,

  // **`files`로 감싼다.** 원래 `js.configs.recommended`에는 `files`가 없어 *모든* 파일에 붙는데,
  // 위에서 JSON을 대상에 넣었으므로 `no-irregular-whitespace` 같은 JS 규칙이 JSON AST에 걸려
  // `sourceCode.getAllComments is not a function`으로 죽는다(ESLint 10에서 실측).
  { ...(js.configs.recommended as Linter.Config), files: ["**/*.{ts,tsx,js,mjs,cjs}"] },

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tseslint.plugin as never },
    languageOptions: {
      parser: tseslint.parser as never,
      // parserOptions.project를 일부러 두지 않는다. 경계 규칙은 import 경로만 보고
      // 타입 정보가 필요 없어서, 타입 검사 프로그램을 만들지 않으면 그만큼 컴파일러 API에 덜 묶인다.
      parserOptions: { sourceType: "module", ecmaVersion: "latest" },
    },
    rules: {
      // zod 스키마를 `export const X` + `export type X`로 함께 내보내는데, 코어 규칙은
      // 이걸 재선언으로 본다. 진짜 재선언은 tsc가 잡는다.
      "no-redeclare": "off",
      // 인터페이스 메서드의 파라미터를 미사용으로 본다. tsconfig의
      // noUnusedLocals/noUnusedParameters가 TS 의미를 알고 같은 일을 한다.
      "no-unused-vars": "off",
      // 코어 규칙은 어떤 전역이 있는지 스스로 알 수 없어 `process` 같은 것을 미정의로 본다.
      // 각 패키지 tsconfig의 `types`가 전역을 정하고 tsc가 검사한다.
      "no-undef": "off",
      // 흡수해 온 코드가 몇 자리에서 이것들을 eslint-disable로 지목한다. 규칙이 꺼져 있으면
      // 그 주석이 "쓸모없는 지시"로 남아 오히려 노이즈가 된다.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-object-type": "error",
    },
  },
];

export default { configs: { base } };
