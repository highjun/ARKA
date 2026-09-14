import ops from "ops/lint";

/**
 * contracts는 **아무도 import하지 않는다.** 양쪽이 다 필요한 코드라면 이미 여기 있어야 하고,
 * 한쪽만 쓰는 코드라면 여기서 빼야 한다(→ ADR 0001).
 */
export default [
  ...ops.configs.base,

  {
    files: ["src/**/*.ts", "*.config.ts"],
    rules: {
      // 다른 패키지를 상대경로로 가져오는 것. client·server에는 있었는데 여기만 빠져 있었다
      // (2026-09-14 실측) — 아래 zone이 `../client/src`를 막지만 이것은 그 밖의 패키지도 막는다.
      "import-x/no-relative-packages": "error",
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
