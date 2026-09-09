import { defineConfig } from "vitest/config";

/** 커스텀 린트 규칙의 fixture 테스트 — 규칙이 죽어 있어도 초록이기 때문이다. */
export default defineConfig({
  test: { include: ["eslint-rules/**/*.test.ts"], environment: "node" },
});
