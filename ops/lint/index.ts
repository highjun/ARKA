import checkFile from "eslint-plugin-check-file";
import comments from "@eslint-community/eslint-plugin-eslint-comments";
import vitest from "@vitest/eslint-plugin";
import js from "@eslint/js";
import json from "@eslint/json";
import sonarjs from "eslint-plugin-sonarjs";
import importX, { createNodeResolver } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import type { Linter } from "eslint";

const COMMENT_RULES = ["no-warning-comments", "@eslint-community/eslint-comments/*"];

const base: Linter.Config[] = [
  { ignores: ["**/node_modules/**", "**/.output/**"] },

  {
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver-next": [createNodeResolver({ extensions: [".ts", ".tsx", ".js", ".jsx", ".json"] })],
    },
  },
  {
    files: ["**/*.{ts,tsx,js}"],
    rules: { "import-x/no-extraneous-dependencies": "error" },
  },

  {
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

  { ...(js.configs.recommended as Linter.Config), files: ["**/*.{ts,tsx,js,mjs,cjs}"] },

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tseslint.plugin as never },
    languageOptions: {
      parser: tseslint.parser as never,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        projectService: { allowDefaultProject: ["eslint.config.ts", "stylelint.config.ts"] },
      },
    },
    rules: {
      "no-redeclare": "off",
      "no-unused-vars": "off",
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
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
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    plugins: { "@eslint-community/eslint-comments": comments },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "no-warning-comments": [
        "error",
        {
          terms: ["todo", "fixme", "xxx", "hack"],
          location: "start",
          decoration: ["*"],
        },
      ],
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      "@eslint-community/eslint-comments/disable-enable-pair": ["error", { allowWholeFile: false }],
      "@eslint-community/eslint-comments/no-restricted-disable": ["error", ...COMMENT_RULES],
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { sonarjs },
    rules: { "sonarjs/no-commented-code": "error" },
  },

  {
    files: ["**/*.{test,spec}.{ts,tsx}"],
    plugins: { vitest },
    rules: {
      "vitest/valid-title": [
        "error",
        {
          mustMatch: { it: ["[가-힣]", "`it()`/`test()` 이름은 한글 문장으로 쓰세요."] },
        },
      ],
      "vitest/expect-expect": ["error", { assertFunctionNames: ["expect", "expect*"] }],
      "vitest/no-restricted-matchers": [
        "error",
        {
          toMatchSnapshot: "외부 `.snap` 대신 `toMatchInlineSnapshot`을 쓰세요 — 갱신이 diff에 드러납니다.",
        },
      ],
      "vitest/no-large-snapshots": ["error", { maxSize: 20, inlineMaxSize: 12 }],
      "vitest/consistent-test-filename": ["error", { pattern: String.raw`.*\.(test|spec)\.tsx?$` }],
      "vitest/require-top-level-describe": "error",
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      "vitest/no-identical-title": "error",
      "vitest/no-commented-out-tests": "error",
    },
  },

  {
    files: ["src/**/*", "test/**/*"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        {
          "src/**/*.{ts,tsx,css}": "+([a-zA-Z0-9])*(.+([a-z0-9]))",
          "test/**/*.{ts,tsx}": "+([a-zA-Z0-9])*(.+([a-z0-9]))",
          "src/**/{api,model,viewmodel,domain}/I*.ts": "I+([A-Z])*([a-zA-Z0-9])",
          "src/**/Mock*.ts": "Mock+([A-Z])*([a-zA-Z0-9])",
        },
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-naming-convention": [
        "error",
        {
          "src/*/": "CAMEL_CASE",
          "src/extensions/*/": "CAMEL_CASE",
        },
      ],
    },
  },
];

export default { configs: { base } };
