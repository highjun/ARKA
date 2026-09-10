import comments from "@eslint-community/eslint-plugin-eslint-comments";
import js from "@eslint/js";
import json from "@eslint/json";
import jsdoc from "eslint-plugin-jsdoc";
import sonarjs from "eslint-plugin-sonarjs";
import tsdoc from "eslint-plugin-tsdoc";
import importX, { createNodeResolver } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import type { Linter } from "eslint";
import { arkaRules } from "./rules/index.ts";

/**
 * **공개 면에는 문서가 필수다**(→ ADR 0004). 아직 전 패키지에 켜지 못해 각 패키지가 자기
 * `eslint.config.ts`에서 켠다 — 위반이 0이 된 곳부터다. 전부 켜지면 이 상수는 바탕으로 들어간다.
 *
 * 바탕에서 `files` 글롭으로 가르지 못한다: **base path가 각 패키지 루트**라
 * `packages/contracts/**`가 아무것도 매치하지 않는다(2026-09-10 실측 — 조용히 통과했다).
 *
 * `z.infer` 별칭은 뺀다 — 바로 위 스키마(`export const X`)가 문서를 들고 있고 이름도 같아,
 * 여기 문서를 달면 글자 그대로의 동어반복이 된다. 실측으로 476건 중 46건이 이 형태였다.
 */
export const requireJsdoc: Linter.RuleEntry = ["error", {
  publicOnly: true,
  enableFixer: false,
  exemptOverloadedImplementations: true,
  require: { FunctionDeclaration: true, ClassDeclaration: true, MethodDefinition: true, ArrowFunctionExpression: true },
  contexts: [
    "TSInterfaceDeclaration",
    "TSEnumDeclaration",
    'TSTypeAliasDeclaration:not([typeAnnotation.typeName.right.name="infer"])',
  ],
}];

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

  // 플러그인은 **여기서 한 번만** 등록한다 — 다시 등록하면 `Cannot redefine plugin`으로 죽는다.
  // **리졸버가 없으면 경계 규칙이 반쪽이다**: `no-restricted-paths`가 확장자 없는 import를
  // 풀지 못해 zone과 비교할 것이 없어 **조용히 통과한다**(2026-09-10 실측).
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
    plugins: { "@eslint-community/eslint-comments": comments, arka: arkaRules },
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
      // 주석은 대상 **위**에 둔다(→ ADR 0004). 줄 끝에 붙으면 코드가 밀려 읽기가 나빠지고,
      // 길어질수록 가로로 흐른다.
      "line-comment-position": ["error", { position: "above" }],
      // 주석 한 덩어리의 상한. 넘으면 코드가 아니라 문서라 ADR로 간다.
      "arka/max-comment-lines": ["error", { line: 4, block: 4, tsdoc: 10 }],
    },
  },

  {
    // **선언 위의 주석은 `/** */`다**(→ ADR 0004). 그래야 에디터 hover에 뜬다.
    files: ["**/*.{ts,tsx}"],
    plugins: { jsdoc, tsdoc, sonarjs },
    rules: {
      // **대상을 최상위 선언로 좁히고 fixer는 끈다**(2026-09-10 실측). 기본 컨텍스트를 그대로 두면
      // 함수 본문 안 화살표까지 잡고, fixer는 **여러 줄 `//` 묶음의 마지막 줄만 바꿔** 앞 줄을
      // 매달린 채로 남긴다. `allowedPrefixes`는 손대지 않는다 — 기본값이 지시문을 이미 뺀다.
      "jsdoc/convert-to-jsdoc-comments": ["error", {
        enableFixer: false,
        contexts: [
          "ExportNamedDeclaration > FunctionDeclaration",
          "ExportNamedDeclaration > ClassDeclaration",
          "ExportNamedDeclaration > TSInterfaceDeclaration",
          "ExportNamedDeclaration > TSTypeAliasDeclaration",
          "ExportNamedDeclaration > TSEnumDeclaration",
          "Program > FunctionDeclaration",
          "Program > ClassDeclaration",
          "Program > TSInterfaceDeclaration",
          "Program > TSTypeAliasDeclaration",
        ],
        contextsBeforeAndAfter: [],
      }],
      // 내용이 없는 문서는 자리만 채운다 — 빈 블록이 있으면 다음 사람이 채워졌다고 믿는다.
      "jsdoc/require-description": "error",
      "jsdoc/no-blank-blocks": "error",
      "jsdoc/no-blank-block-descriptions": "error",
      // `/** 이름을 돌려준다 */ getName()` 같은 동어반복. 이름이 이미 말한 것을 되풀이하지 않는다.
      "jsdoc/informative-docs": "error",
      // 타입은 시그니처가 말한다 — `@param {string}`은 두 벌이 되어 갈린다.
      "jsdoc/no-types": "error",
      "tsdoc/syntax": "error",
      // 주석 처리된 코드는 지운다. git이 이미 영구 보관한다.
      "sonarjs/no-commented-code": "error",
    },
  },

];

export default { configs: { base } };
