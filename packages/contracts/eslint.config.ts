import ops, { requireJsdoc } from "ops/lint";

/**
 * contracts는 **아무도 import하지 않는다.** 양쪽이 다 필요한 코드라면 이미 여기 있어야 하고,
 * 한쪽만 쓰는 코드라면 여기서 빼야 한다(→ ADR 0001).
 */
export default [
  ...ops.configs.base,

  {
    // **공개 면에 문서가 필수다**(→ ADR 0004). 위반이 0이라 여기서 켠다 — client·server는
    // 아직 남아 있어 각자 정리되면 자기 설정에서 켠다.
    files: ["src/**/*.ts"],
    rules: { "jsdoc/require-jsdoc": requireJsdoc },
  },

  {
    files: ["src/**/*.ts", "*.config.ts"],
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
