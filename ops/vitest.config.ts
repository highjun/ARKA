import { defineConfig } from "vitest/config";

/**
 * 작업장의 테스트. 커스텀 린트 규칙의 fixture 테스트(규칙이 죽어 있어도 초록이라 필요하다)와
 * 저장소 전체에 걸린 불변식 검사가 함께 산다.
 */
export default defineConfig({
  test: { include: ["**/*.test.ts"], environment: "node" },
});
