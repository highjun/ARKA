import { defineConfig } from "vitest/config";

/** 커스텀 린트 규칙의 fixture 테스트. `tooling/`은 패키지가 아니라 설정을 따로 둔다. */
export default defineConfig({
  test: { include: ["tooling/**/*.test.ts"], environment: "node" },
});
