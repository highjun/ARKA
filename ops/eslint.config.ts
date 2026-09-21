import ops from "./lint/index.ts";

export default [
  ...ops.configs.base,
  {
    files: ["**/*.ts"],
    languageOptions: { parserOptions: { projectService: true } },
  },
];
