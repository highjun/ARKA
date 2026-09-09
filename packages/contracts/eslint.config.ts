import importX from "eslint-plugin-import-x";
import ops from "ops/eslint";

/**
 * contracts는 **아무도 import하지 않는다.** 양쪽이 다 필요한 코드라면 이미 여기 있어야 하고,
 * 한쪽만 쓰는 코드라면 여기서 빼야 한다(→ ADR 0001).
 */
export default [
  ...ops.configs.base,

  {
    files: ["src/**/*.ts"],
    rules: { "arka/file-names": "error" },
  },

  {
    files: ["src/**/*.ts", "*.config.ts"],
    plugins: { "import-x": importX },
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src",
              from: ["../client/src", "../server/src"],
              message: "contracts는 client·server를 import할 수 없습니다. 양쪽이 다 필요한 코드라면 이미 contracts에 있어야 하고, 한쪽만 쓰는 코드라면 contracts에서 빼세요.",
            },
          ],
        },
      ],
    },
  },
];
