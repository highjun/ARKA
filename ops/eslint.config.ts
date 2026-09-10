import ops, { requireJsdoc } from "./lint/index.ts";

/** 작업장 자신도 검사한다 — 저장소를 검사하는 코드가 검사를 안 받으면 앞뒤가 안 맞는다. */
export default [
  ...ops.configs.base,
  {
    // **공개 면에 문서가 필수다**(→ ADR 0004). 위반이 0이라 여기서 켠다.
    files: ["**/*.ts"],
    rules: { "jsdoc/require-jsdoc": requireJsdoc },
  },
];
