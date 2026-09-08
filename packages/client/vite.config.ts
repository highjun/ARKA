import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitestSetup.ts"],
    // arka-ui에서 가져온 테스트들이 전역 describe/it을 쓴다. 명시적 import도
    // 그대로 동작하므로 두 방식이 공존한다.
    globals: true,
    // @primer/react가 CSS를 부수효과로 import한다. 기본값이면 SSR 외부화되어
    // Node 로더가 .css를 못 읽고 죽으므로 Vite 변환을 타게 인라인시킨다.
    server: { deps: { inline: [/@primer\/react/, /@primer\/primitives/] } },
  },
});
