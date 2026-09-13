import path from "node:path";

import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const clientRoot = path.resolve(import.meta.dirname);

/**
 * 빌드된 클라이언트가 놓이는 자리(저장소 루트 기준).
 *
 * **여기가 이 값의 유일한 출처다.** 서버가 이것을 정적으로 서빙하므로 E2E가 같은 값을
 * `ADE_CLIENT_ROOT`로 넘긴다(`test/e2e/playwright.config.ts`). 이미지 안에서는 `/app/dist/client`라
 * 다르다 — `ops/deploy/Dockerfile`이 `.output/dist`를 `dist`로 펴기 때문이다.
 */
export const CLIENT_DIST = ".output/dist/client";

export default defineConfig({
  // 진입점(`index.html`)이 `src/workbench/`에 산다 — 셸을 띄우는 것은 workbench의 일이다.
  // vite는 `index.html`을 root에서 찾으므로 root가 따라간다.
  root: path.join(clientRoot, "src/workbench"),
  plugins: [
    react(),
    // 설치 가능한 PWA(→ ADR 0018). Service Worker 파일명은 `app-sw.js`다 — `/sw.js`는 이 호스트명에
    // 남은 옛 PWA를 걷어내는 kill-switch가 서버에서 차지하고 있다(server/features/static).
    VitePWA({
      registerType: "autoUpdate",
      filename: "app-sw.js",
      includeAssets: ["arka-mark.svg"],
      manifest: {
        name: "ARKA",
        short_name: "ARKA",
        description: "Agent Development Environment",
        lang: "ko",
        display: "standalone",
        start_url: "/",
        scope: "/",
        theme_color: "#1f2328",
        background_color: "#ffffff",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // API는 절대 캐시하지 않는다 — 낡은 응답이 화면에 남는 것이 가장 나쁜 실패다. 앱 셸(정적
        // 자산)만 프리캐시한다. 새 빌드가 뜨면 SW가 갱신되고 클라이언트가 스스로 새로고침한다.
        navigateFallbackDenylist: [/^\/api\//u],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      // 개발 서버에서는 켜지 않는다 — 새로고침마다 캐시와 싸우게 된다.
      devOptions: { enabled: false },
    }),
  ],
  // 배포 단위는 `.output/dist/` 하나다(→ ADR 0002) — 서버 번들과 나란히 놓인다.
  build: {
    outDir: path.join(clientRoot, "../..", CLIENT_DIST),
    emptyOutDir: true,
    // 벤더를 청크로 나눈다 — 앱 코드가 바뀌어도 CodeMirror·Primer·React 청크는 캐시에 남고, PWA 프리캐시
    // 항목 하나가 2MB를 넘지 않는다.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "codemirror", test: /node_modules[\\/]@(?:codemirror|lezer)[\\/]/u },
            { name: "primer", test: /node_modules[\\/]@primer[\\/]/u },
            { name: "radix", test: /node_modules[\\/]@radix-ui[\\/]/u },
            { name: "react", test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/u },
          ],
        },
      },
    },
  },
  server: {
    // 클라이언트는 `/api/*`를 같은 출처로 부른다 — dev에서도 그 전제가 깨지지 않게
    // 서버로 넘긴다. SSE(`/api/files/watch`)가 버퍼링되지 않도록 프록시를 쓴다.
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: true } },
  },
  test: {
    // **root를 되돌린다.** 위의 `root`는 vite가 `index.html`을 찾는 자리이고, vitest에게는
    // 테스트를 찾는 자리다 — 그대로 두면 `src/workbench` 안의 것만 집어 112개 중 28개만 돈다.
    root: clientRoot,
    // `test/`는 Playwright가 진짜 브라우저로 돌리는 것만 산다(e2e·vrt) — vitest가 집어가면 안 된다.
    // 단위·계약·스모크는 대상 옆에 있으므로 이 제외에 걸리지 않는다.
    exclude: ["**/node_modules/**", "test/**"],
    environment: "jsdom",
    setupFiles: ["./test/vitestSetup.ts"],
    // arka-ui에서 가져온 테스트들이 전역 describe/it을 쓴다. 명시적 import도
    // 그대로 동작하므로 두 방식이 공존한다.
    globals: true,
    // @primer/react가 CSS를 부수효과로 import한다. 기본값이면 SSR 외부화되어
    // Node 로더가 .css를 못 읽고 죽으므로 Vite 변환을 타게 인라인시킨다.
    server: { deps: { inline: [/@primer\/react/, /@primer\/primitives/] } },
  },
});
