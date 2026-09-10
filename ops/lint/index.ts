import comments from "@eslint-community/eslint-plugin-eslint-comments";
import js from "@eslint/js";
import json from "@eslint/json";
import importX, { createNodeResolver } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import type { Linter } from "eslint";

// 주석 규칙이 자기 자신을 끄지 못하게 막을 목록(→ ADR 0004). `sonarjs/no-commented-code`만
// 뺀다 — 주석 처리된 코드를 알아보는 휴리스틱이라 오탐이 있을 수 있다.
const COMMENT_RULES = [
  "jsdoc/*",
  "tsdoc/*",
  "arka/*",
  "no-warning-comments",
  "line-comment-position",
  "@eslint-community/eslint-comments/*",
];


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
  //
  // **리졸버가 없으면 경계 규칙이 반쪽이다.** `no-restricted-paths`는 import를 실제 파일 경로로
  // 풀어 zone과 비교하는데, 설정이 없으면 `"../../../server/src/app"`(TS 관행대로 확장자를 뺀 것)이
  // 해석되지 않아 **비교할 것이 없어 조용히 통과한다**(2026-09-10 실측). 확장자를 알려 준다.
  {
    plugins: { "import-x": importX },
    settings: { "import-x/resolver-next": [createNodeResolver({ extensions: [".ts", ".tsx", ".js", ".jsx", ".json"] })] },
  },
  {
    // **선언하지 않은 것을 import하면 잡는다**(→ ADR 0002). Node와 ESLint의 해석기가
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
        {
          selector: 'Member[name.value="paths"]',
          message: "tsconfig paths 별칭을 쓰지 않습니다 — package.json의 imports 필드를 쓰세요.",
        },
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
      // `@ts-ignore`는 왜 껐는지를 남기지 않고 타입 오류를 숨긴다(→ ADR 0004). `@ts-expect-error`는
      // 오류가 사라지면 스스로 실패하므로 설명과 함께 허용한다.
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-expect-error": "allow-with-description",
        minimumDescriptionLength: 10,
      }],
    },
  },

  {
    // **주석으로 우회하는 길을 막는다**(→ ADR 0004). 규칙을 끄는 것 자체는 막지 않고,
    // 무엇을 왜 끄는지를 남기게 한다 — 사유 없는 `eslint-disable`은 다음 사람이 되살릴 근거가 없다.
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    plugins: { "@eslint-community/eslint-comments": comments },
    // 규칙이 고쳐져 지시문이 필요 없어졌는데도 남아 있으면 실패한다. 기본값은 `warn`이라
    // 스크롤에 묻힌다 — 쓸모없는 지시문은 "여기 위반이 있다"는 거짓 표시로 남는다.
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // 미룬 일은 주석이 아니라 `docs/tasks/`에 쌓는다. `decoration`은 `/** * TODO */`처럼
      // 별표로 꾸며진 줄도 같은 것으로 보게 한다.
      "no-warning-comments": ["error", {
        terms: ["todo", "fixme", "xxx", "hack"],
        location: "start",
        decoration: ["*"],
      }],
      "@eslint-community/eslint-comments/require-description": "error",
      // 규칙 이름 없이 통째로 끄면 그 뒤에 생기는 위반까지 전부 묻힌다.
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      // `allowWholeFile: false` — 파일 끝까지 열어 두는 `eslint-disable`을 허용하지 않는다.
      "@eslint-community/eslint-comments/disable-enable-pair": ["error", { allowWholeFile: false }],
      "@eslint-community/eslint-comments/no-restricted-disable": ["error", ...COMMENT_RULES],
    },
  },
];

export default { configs: { base } };
