import ops from "./lint/index.ts";

export default [
  { ignores: ["figma/**"] },
  ...ops.configs.base,
  {
    files: ["**/*.ts"],
    languageOptions: { parserOptions: { projectService: true } },
  },
];
