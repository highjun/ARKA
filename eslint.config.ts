import js from "@eslint/js";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { arkaRules } from "./tooling/eslint-rules";

export default [
  // 산출물은 검사하지 않는다 — 번들된 코드가 규칙에 걸려도 고칠 소스가 여기가 아니다.
  { ignores: ["**/node_modules/**", "**/dist/**", "**/storybook-static/**", "**/.output/**"] },

  js.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      // parserOptions.project를 일부러 두지 않는다. 아래 경계 규칙은 import
      // 경로만 보고 타입 정보가 필요 없어서, 타입 검사 프로그램을 만들지 않으면
      // 그만큼 컴파일러 API에 덜 묶인다.
      parserOptions: { sourceType: "module", ecmaVersion: "latest" },
    },
    rules: {
      // zod 스키마를 `export const X` + `export type X`로 함께 내보내는데,
      // 코어 규칙은 이걸 재선언으로 본다. 진짜 재선언은 tsc가 잡는다.
      "no-redeclare": "off",
      // 인터페이스 메서드의 파라미터를 미사용으로 본다. tsconfig의
      // noUnusedLocals/noUnusedParameters가 TS 의미를 알고 같은 일을 한다.
      "no-unused-vars": "off",
      // 코어 규칙은 어떤 전역이 있는지 스스로 알 수 없어 `process` 같은 것을
      // 미정의로 본다. 각 패키지 tsconfig의 `types`가 전역을 정하고 tsc가
      // 검사하므로 여기서 중복해서 볼 이유가 없다.
      "no-undef": "off",
      // 흡수해 온 코드가 몇 자리에서 이것들을 eslint-disable로 지목한다. 규칙이
      // 꺼져 있으면 그 주석이 "쓸모없는 지시"로 남아 오히려 노이즈가 된다.
      // 타입 정보가 필요 없는 것들만 켠다(parserOptions.project를 안 두므로).
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-object-type": "error",
    },
  },

  {
    // 훅 규칙. 의존성 배열을 일부러 좁힌 자리(CodeMirror 에디터)를 eslint-disable로
    // 여는데, 플러그인이 없으면 그 주석 자체가 에러가 된다.
    files: ["packages/client/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // 구조 규칙. 문서로만 있던 계층 규율을 강제한다 — ADR 0005의 의존 방향이 코드에서
  // 실제로 지켜지는지는 이것들이 본다.
  {
    // 글롭은 슬라이스 구조를 그대로 따라간다. 구조가 바뀌면 여기도 바꿔야 하는데, 안 바꾸면
    // 매치되는 파일이 0개가 되어 규칙이 에러도 경고도 없이 죽는다(2026-09-08에 실제로 겪음).
    // `npx eslint --print-config <파일>`로 규칙이 붙어 있는지 확인할 수 있다.
    files: [
      "packages/client/src/workbench/view/**/*.tsx",
      "packages/client/src/extensions/*/view/**/*.tsx",
    ],
    plugins: { arka: arkaRules },
    rules: { "arka/view-only-uses-view-model": "error" },
  },
  {
    files: [
      "packages/client/src/workbench/model/**/*.ts",
      "packages/client/src/extensions/*/model/**/*.ts",
    ],
    plugins: { arka: arkaRules },
    rules: { "arka/model-is-state-library-free": "error" },
  },

  {
    files: ["packages/*/src/**/*.{ts,tsx}"],
    plugins: { "import-x": importX },
    // 기본 리졸버는 .js/.mjs/.cjs/.json만 찾는다. .ts를 넣지 않으면 확장자 없는
    // import를 해석하지 못하고, 그러면 아래 규칙이 에러도 경고도 없이 조용히
    // 건너뛴다.
    settings: {
      "import-x/resolver": {
        // `.tsx`가 빠지면 확장자 없이 가리키는 import를 해석하지 못해 zone이 조용히 통과한다.
        node: { extensions: [".ts", ".tsx", ".js", ".json"] },
      },
    },
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./packages/contracts/src",
              from: ["./packages/client/src", "./packages/server/src"],
              message:
                "contracts는 client·server를 import할 수 없습니다. 양쪽이 다 필요한 코드라면 이미 contracts에 있어야 하고, 한쪽만 쓰는 코드라면 contracts에서 빼세요.",
            },
            {
              target: "./packages/client/src",
              from: "./packages/server/src",
              message:
                "client는 server를 import할 수 없습니다. 공유할 코드는 contracts 패키지로 옮기고 패키지명 'contracts'로 가져오세요.",
            },
            {
              target: "./packages/server/src",
              from: "./packages/client/src",
              message:
                "server는 client를 import할 수 없습니다. 공유할 코드는 contracts 패키지로 옮기고 패키지명 'contracts'로 가져오세요.",
            },
            // 아래는 클라이언트 내부 네 구역의 경계다. → docs/adr/0005-client-structure.md
            {
              target: "./packages/client/src/extensions",
              from: "./packages/client/src/workbench",
              message:
                "extension은 workbench를 import할 수 없습니다. 이 0건이 마이크로커널 전환의 조건입니다. 필요한 것은 core의 DI 토큰이나 이벤트로 받으세요.",
            },
            // extension끼리는 서로 모른다. `no-restricted-paths`는 "형제끼리 금지"를 한 줄로
            // 못 써서 쌍마다 적어야 한다 — extension을 추가하면 여기도 추가해야 한다.
            {
              target: "./packages/client/src/extensions/filesystem",
              from: "./packages/client/src/extensions/agent",
              message:
                "extension끼리 직접 import할 수 없습니다. DI 토큰이나 이벤트로만 소통하세요.",
            },
            {
              target: "./packages/client/src/extensions/agent",
              from: "./packages/client/src/extensions/filesystem",
              message:
                "extension끼리 직접 import할 수 없습니다. DI 토큰이나 이벤트로만 소통하세요.",
            },
            {
              target: "./packages/client/src/core",
              from: ["./packages/client/src/workbench", "./packages/client/src/extensions"],
              message:
                "core는 workbench·extensions를 import할 수 없습니다. core는 조립과 중개만 하고 무엇이 꽂히는지 몰라야 합니다.",
            },
            {
              target: "./packages/client/src/shared",
              from: [
                "./packages/client/src/core",
                "./packages/client/src/workbench",
                "./packages/client/src/extensions",
              ],
              message:
                "shared는 아무것도 import할 수 없습니다. 공통 추출은 아래로만 합니다.",
            },
          ],
        },
      ],
    },
  },
];
