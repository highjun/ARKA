import json from "@eslint/json";
import packageJson from "eslint-plugin-package-json";
import yml from "eslint-plugin-yml";
import type { Linter } from "eslint";

export default [
  { ignores: ["packages/**", "ops/**", "docs/**", "node_modules/**", ".output/**", ".claude/**", "pnpm-lock.yaml"] },
  {
    files: ["tsconfig*.json"],
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

  packageJson.configs.recommended as unknown as Linter.Config,

  ...(yml.configs["flat/standard"] as unknown as Linter.Config[]),
  ...(yml.configs["flat/prettier"] as unknown as Linter.Config[]),
  {
    files: ["**/*.{yml,yaml}"],
    rules: { "yml/plain-scalar": "off" },
  },
];
