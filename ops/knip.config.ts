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
        "src/app/main.tsx",
        "src/**/*.stories.tsx",
        ".storybook/{main,preview}.ts",
        "test/visual-regression/run.ts",
        "test/visual-regression/config.ts",
        "test/e2e/*.spec.ts",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.visualRegression.ts",
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
        "smoke/{local,anon}.ts",
        "hooks/{preCommit,prePush}.ts",
        "needsReview.ts",
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
