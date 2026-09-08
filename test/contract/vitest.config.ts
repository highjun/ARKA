import { defineConfig } from "vitest/config";

/**
 * 패키지 둘 이상을 한 프로세스에 올리는 테스트 — 클라이언트의 계약 스위트를 서버 앱에 대고 돈다.
 * 패키지 안에 둘 수 없다(client↔server import 금지). `test/vrt/`와 같은 이유로 저장소 전역이다.
 */
export default defineConfig({
  test: {
    include: ["test/contract/**/*.test.ts"],
    environment: "node",
  },
});
