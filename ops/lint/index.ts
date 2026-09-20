import checkFile from "eslint-plugin-check-file";
import comments from "@eslint-community/eslint-plugin-eslint-comments";
import vitest from "@vitest/eslint-plugin";
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
 * **공개 면에는 문서가 필수다**.
 *
 * `z.infer` 별칭은 뺀다 — 바로 위 스키마(`export const X`)가 문서를 들고 있고 이름도 같아,
 * 여기 문서를 달면 글자 그대로의 동어반복이 된다. 실측으로 476건 중 46건이 이 형태였다.
 */
const REQUIRE_JSDOC: Linter.RuleEntry = [
  "error",
  {
    publicOnly: true,
    enableFixer: false,
    exemptOverloadedImplementations: true,
    require: {
      FunctionDeclaration: true,
      ClassDeclaration: true,
      MethodDefinition: true,
      ArrowFunctionExpression: true,
    },
    contexts: [
      "TSInterfaceDeclaration",
      "TSEnumDeclaration",
      'TSTypeAliasDeclaration:not([typeAnnotation.typeName.right.name="infer"])',
    ],
  },
];

// 주석 규칙이 자기 자신을 끄지 못하게 막을 목록. `sonarjs/no-commented-code`만
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
 * **여기 있는 규칙은 전부 `docs/CONVENTIONS.md`의 항목이 든다.** 주인 없는 규칙은 껐다
 * (2026-09-13 지웠다. git 이력에 있다) — 규약이 없으면 강제할 근거가 없다.
 */
const base: Linter.Config[] = [
  // 산출물은 검사하지 않는다 — 번들된 코드가 규칙에 걸려도 고칠 소스가 여기가 아니다.
  { ignores: ["**/node_modules/**", "**/dist/**", "**/storybook-static/**", "**/.output/**"] },

  // 플러그인은 **여기서 한 번만** 등록한다 — 다시 등록하면 `Cannot redefine plugin`으로 죽는다.
  // **리졸버가 없으면 경계 규칙이 반쪽이다**: `no-restricted-paths`가 확장자 없는 import를
  // 풀지 못해 zone과 비교할 것이 없어 **조용히 통과한다**(2026-09-10 실측).
  {
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver-next": [createNodeResolver({ extensions: [".ts", ".tsx", ".js", ".jsx", ".json"] })],
    },
  },
  {
    // **선언하지 않은 것을 import하면 잡는다**. Node와 ESLint의 해석기가
    // `node_modules`를 위로 걸어 올라가 저장소 루트에서 찾아 주기 때문에, 선언이 빠져도 조용히
    // 동작한다 — 이 규칙이 없으면 패키지가 스스로 설 수 있는지 아무도 모른다.
    files: ["**/*.{ts,tsx,js}"],
    rules: { "import-x/no-extraneous-dependencies": "error" },
  },

  {
    // **각 패키지의 `tsconfig.json`을 검사한다**. 이 블록이 없으면 `eslint .`은
    // `.json`을 아예 집지 않는다. 주석이 있으므로 언어는 `json/jsonc`다. 같은 금지가 루트
    // `eslint.config.ts`에도 있다 — 루트 파일은 이 설정을 거치지 않아서다.
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
      // **타입 정보를 켠다.** 아래 규칙 넷은 타입 없이는 판정할 수 없고, 그것이 잡는 것을
      // 잡는 다른 것이 없다 — 특히 `await`를 빼먹은 Promise는 조용히 성공한다.
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        // 어느 tsconfig에도 없는 설정 파일 둘. `eslint.config.ts`는 `ops/lint`가 TS 원본이라
        // 패키지 옵션으로 ops 소스를 컴파일하게 되어 뺐고,
        // `stylelint.config.ts`는 `@primer/stylelint-config`가 타입을 안 싣는다. 파싱만 한다.
        projectService: { allowDefaultProject: ["eslint.config.ts", "stylelint.config.ts"] },
      },
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
      // `@ts-ignore`는 왜 껐는지를 남기지 않고 타입 오류를 숨긴다. `@ts-expect-error`는
      // 오류가 사라지면 스스로 실패하므로 설명과 함께 허용한다.
      /*
       * **타입이 있어야 판정되는 것들.** `await`를 빼먹은 Promise는 테스트도 타입 검사도
       * 통과하고 런타임에 조용히 어긋난다 — 이 저장소는 서버 라우트·에이전트 실행·파일 I/O가
       * 전부 async다.
       */
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      // `require-await`는 켜지 않는다 — `async function*`은 `await` 없이도 **타입이 요구하는**
      // 모양인데(`Symbol.asyncIterator`) 규칙이 그것을 구별하지 못한다(2026-09-14 실측).
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
    },
  },

  {
    // **주석으로 우회하는 길을 막는다**. 규칙을 끄는 것 자체는 막지 않고,
    // 무엇을 왜 끄는지를 남기게 한다 — 사유 없는 `eslint-disable`은 다음 사람이 되살릴 근거가 없다.
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    plugins: { "@eslint-community/eslint-comments": comments, arka: arkaRules },
    // 규칙이 고쳐져 지시문이 필요 없어졌는데도 남아 있으면 실패한다. 기본값은 `warn`이라
    // 스크롤에 묻힌다 — 쓸모없는 지시문은 "여기 위반이 있다"는 거짓 표시로 남는다.
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // 미룬 일은 주석에 쌓지 않는다. `decoration`은 `/** * TODO */`처럼
      // 별표로 꾸며진 줄도 같은 것으로 보게 한다.
      "no-warning-comments": [
        "error",
        {
          terms: ["todo", "fixme", "xxx", "hack"],
          location: "start",
          decoration: ["*"],
        },
      ],
      "@eslint-community/eslint-comments/require-description": "error",
      // 규칙 이름 없이 통째로 끄면 그 뒤에 생기는 위반까지 전부 묻힌다.
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      // `allowWholeFile: false` — 파일 끝까지 열어 두는 `eslint-disable`을 허용하지 않는다.
      "@eslint-community/eslint-comments/disable-enable-pair": ["error", { allowWholeFile: false }],
      "@eslint-community/eslint-comments/no-restricted-disable": ["error", ...COMMENT_RULES],
      // 주석은 대상 **위**에 둔다. 줄 끝에 붙으면 코드가 밀려 읽기가 나빠지고,
      // 길어질수록 가로로 흐른다.
      "line-comment-position": ["error", { position: "above" }],
      // 주석 한 덩어리의 상한. 넘으면 코드가 아니라 문서다.
      "arka/max-comment-lines": ["error", { line: 4, block: 4, tsdoc: 10 }],
    },
  },

  {
    // **선언 위의 주석은 `/** */`다**. 그래야 에디터 hover에 뜬다.
    files: ["**/*.{ts,tsx}"],
    plugins: { jsdoc, tsdoc, sonarjs },
    rules: {
      // **대상을 최상위 선언로 좁히고 fixer는 끈다**(2026-09-10 실측). 기본 컨텍스트를 그대로 두면
      // 함수 본문 안 화살표까지 잡고, fixer는 **여러 줄 `//` 묶음의 마지막 줄만 바꿔** 앞 줄을
      // 매달린 채로 남긴다. `allowedPrefixes`는 손대지 않는다 — 기본값이 지시문을 이미 뺀다.
      "jsdoc/convert-to-jsdoc-comments": [
        "error",
        {
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
        },
      ],
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
      "jsdoc/require-jsdoc": REQUIRE_JSDOC,
    },
  },

  {
    /*
     * **테스트의 규율.** 네 패키지가 전부 vitest를 쓰므로 바탕에 둔다. 이 블록이 대신하는 것은
     * client 설정에 있던 `no-restricted-syntax` 선택자 둘이다 — 그 배열은 한 파일에 한 벌이라
     * 블록이 겹치면 통째로 덮이는데(2026-09-09·09-14에 두 번 겪었다), 규칙 이름이 갈리면
     * 그 함정에서 그만큼 벗어난다.
     */
    files: ["**/*.{test,spec}.{ts,tsx}"],
    plugins: { vitest },
    rules: {
      /*
       * `it`/`test` 이름은 **한글 문장**이다. `describe`는 대상의 식별자라 영문
       * 그대로다 — 실측 186건이 그 모양이고, 규약이 둘을 묶어 적던 것을 2026-09-14에 갈랐다.
       */
      "vitest/valid-title": [
        "error",
        {
          mustMatch: { it: ["[가-힣]", "`it()`/`test()` 이름은 한글 문장으로 쓰세요."] },
        },
      ],
      /*
       * 단정이 없는 테스트는 "돌았다"만 알려 준다. **단정 헬퍼는 `expect`로 시작하는 이름을
       * 갖는다**(`expectNoA11yViolations`·`expectResponse`) — 그래야 이 규칙이 알아본다.
       */
      "vitest/expect-expect": ["error", { assertFunctionNames: ["expect", "expect*"] }],
      // 외부 `.snap`은 두지 않고 인라인만 쓴다. 인라인도 커지면 읽히지 않는다.
      "vitest/no-restricted-matchers": [
        "error",
        {
          toMatchSnapshot: "외부 `.snap` 대신 `toMatchInlineSnapshot`을 쓰세요 — 갱신이 diff에 드러납니다.",
        },
      ],
      "vitest/no-large-snapshots": ["error", { maxSize: 20, inlineMaxSize: 12 }],
      // 대상 옆에 `<Name>.test.ts`로 둔다.
      "vitest/consistent-test-filename": ["error", { pattern: String.raw`.*\.(test|spec)\.tsx?$` }],
      // 최상위 `describe`가 없으면 실패 출력에서 무엇의 테스트인지 안 보인다.
      "vitest/require-top-level-describe": "error",
      // 좁혀 놓고 커밋하면 나머지가 조용히 안 돈다.
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      // 같은 이름이 둘이면 어느 쪽이 깨졌는지 출력으로 가려지지 않는다.
      "vitest/no-identical-title": "error",
      // 주석 처리된 테스트는 지운다.
      "vitest/no-commented-out-tests": "error",
    },
  },

  {
    /*
     * **이름.** 규약이 정한 것을 여기서 본다 — 2026-09-14까지 "지금은 리뷰로 본다"였다.
     * PascalCase냐 camelCase냐는 **파일이 내보내는 이름**을 따르므로 기계가 판정하지 못한다.
     * 기계가 판정하는 것은 그 아래의 것들이다 — 하이픈·밑줄 금지, 계층 폴더의 대소문자, 계약(`I<Name>.ts`)과
     * 흉내(`Mock<Name>.ts`)의 접두. 네 패키지가 같은 규약을 쓰므로 바탕에 둔다.
     */
    files: ["src/**/*", "test/**/*"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        {
          // 하이픈·밑줄을 쓰지 않는다. 대소문자는 export 이름이 정한다.
          "src/**/*.{ts,tsx,css}": "+([a-zA-Z0-9])*(.+([a-z0-9]))",
          "test/**/*.{ts,tsx}": "+([a-zA-Z0-9])*(.+([a-z0-9]))",
          // 계약은 `I`로 시작한다 — `view/`가 만져도 되는 것이라는 레이어 표시다.
          "src/**/{model,viewmodel,domain}/I*.ts": "I+([A-Z])*([a-zA-Z0-9])",
          // 흉내는 `Mock`으로 시작한다. 계약 스위트에 걸리는 구현이라는 표시다.
          "src/**/Mock*.ts": "Mock+([A-Z])*([a-zA-Z0-9])",
        },
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-naming-convention": [
        "error",
        {
          // **와일드카드 자리마다 같은 규약이 걸린다** — 컴포넌트 폴더를 집으려고 `**`를 쓰면
          // 그것이 잡은 계층 폴더(`workbench`)까지 PascalCase를 요구한다(2026-09-14 실측 148건).
          // 그래서 컴포넌트 폴더는 `test/structure.test.ts`가 본다 — 그 정규식이 PascalCase를 이미
          // 요구한다. 여기는 계층·기능 폴더만 본다.
          "src/*/": "CAMEL_CASE",
          "src/extensions/*/": "CAMEL_CASE",
        },
      ],
    },
  },
];

export default { configs: { base } };
