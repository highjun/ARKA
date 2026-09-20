import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    ".": {
      entry: ["eslint.config.ts"],
      project: ["*.ts"],
      ignoreDependencies: ["eslint", "@eslint/json", "eslint-plugin-package-json", "eslint-plugin-yml"],
    },
    "packages/client": {
      entry: [
        "src/workbench/main.tsx",
        "src/**/*.stories.tsx",
        ".storybook/{main,preview}.ts",
        "test/vrt/run.ts",
        "test/vrt/vrt.config.ts",
        "test/e2e/*.spec.ts",
        "src/**/*.test.{ts,tsx}",
        "test/**/*.test.ts",
      ],
      project: ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}"],
      ignore: ["src/cssModules.d.ts", "test/e2e/fixture/**"],
    },
    "packages/server": {
      entry: ["src/index.ts", "build.ts", "src/**/*.test.ts", "test/**/*.test.ts"],
      project: ["src/**/*.ts", "test/**/*.ts"],
    },
    "packages/contracts": { entry: ["src/index.ts", "src/**/*.test.ts"], project: ["src/**/*.ts"] },
    ops: {
      entry: [
        "lint/run.ts",
        "lint/index.ts",
        "deploy/{build,smoke,anonSmoke}.ts",
        "hooks/{preCommit,prePush}.ts",
        "*.config.ts",
      ],
      project: ["**/*.ts"],
      ignoreDependencies: ["eslint-plugin-package-json", "eslint-plugin-yml"],
      ignoreBinaries: ["gitleaks"],
    },
  },
  ignoreDependencies: ["pretendard", "@fontsource-variable/cascadia-code", "http-server"],
};

export default config;
