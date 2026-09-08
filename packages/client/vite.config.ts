import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // 배포 단위는 루트 dist/ 하나다(→ ADR 0013) — 서버 번들(dist/server)과 나란히 놓인다.
  build: { outDir: "../../dist/client", emptyOutDir: true },
  server: {
    // 클라이언트는 `/api/*`를 같은 출처로 부른다 — dev에서도 그 전제가 깨지지 않게
    // 서버로 넘긴다. SSE(`/api/files/watch`)가 버퍼링되지 않도록 프록시를 쓴다.
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: true } },
  },
  test: {
    // `e2e/`는 Playwright가 진짜 브라우저로 돌린다 — vitest가 집어가면 안 된다.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
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
