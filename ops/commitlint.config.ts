import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "refactor", "perf", "docs", "test", "build", "ci", "chore", "revert"]],
    "scope-enum": [2, "always", ["contracts", "client", "server", "ops", "repo"]],
    "scope-empty": [0],
    "subject-case": [0],
    "header-max-length": [2, "always", 72],
  },
};

export default config;
