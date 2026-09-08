import js from "@eslint/js";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["**/node_modules/**", "**/dist/**"] },

  js.configs.recommended,

  {
    files: ["**/*.ts"],
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
      // 코어 규칙은 어떤 전역이 있는지 스스로 알 수 없어 `process` 같은 것을
      // 미정의로 본다. 각 패키지 tsconfig의 `types`가 전역을 정하고 tsc가
      // 검사하므로 여기서 중복해서 볼 이유가 없다.
      "no-undef": "off",
    },
  },

  {
    files: ["packages/*/src/**/*.ts"],
    plugins: { "import-x": importX },
    // 기본 리졸버는 .js/.mjs/.cjs/.json만 찾는다. .ts를 넣지 않으면 확장자 없는
    // import를 해석하지 못하고, 그러면 아래 규칙이 에러도 경고도 없이 조용히
    // 건너뛴다.
    settings: {
      "import-x/resolver": {
        node: { extensions: [".ts", ".js", ".json"] },
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
          ],
        },
      ],
    },
  },
];
