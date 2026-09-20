import ops from "ops/lint";

export default [
  ...ops.configs.base,

  {
    files: ["src/**/*.ts", "*.config.ts"],
    rules: {
      "import-x/no-relative-packages": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src",
              from: ["../client/src", "../server/src"],
              message:
                "contracts는 client·server를 import할 수 없습니다. 양쪽이 다 필요한 코드라면 이미 contracts에 있어야 하고, 한쪽만 쓰는 코드라면 contracts에서 빼세요.",
            },
          ],
        },
      ],
    },
  },
];
