import path from "node:path";
import { defineConfig } from "@playwright/test";
import { CLIENT_DIST } from "../../vite.config.ts";

const clientRoot = path.resolve(import.meta.dirname, "../..");
const repoRoot = path.resolve(clientRoot, "../..");
const PORT = 5199;

/**
 * **보이는지**를 검사한다. jsdom 테스트(vitest)와 역할이 다르다.
 *
 * jsdom은 CSS 레이아웃을 적용하지 않아서, 요소가 화면 밖으로 밀려 있거나 배경이 비쳐 읽을
 * 수 없어도 `getByText`가 찾아버린다. `toBeVisible()`은 진짜 브라우저라 그것을 거른다.
 *
 * **여기서는 스크린샷을 찍지 않는다.** 필요한 것은 "보이는가" 하나다. 모양이 변했는지는
 * 스토리를 순회하는 VRT(`../vrt/`)가 따로 본다.
 *
 * 테스트가 여는 워크스페이스는 `fixture/`다 — 저장소나 사용자의 실제 파일에 기대면
 * 테스트가 그 디렉터리 내용에 묶여, 파일 하나만 늘어도 깨진다.
 */
export default defineConfig({
  timeout: 60_000,
  outputDir: path.join(clientRoot, ".output/playwright/test-results"),
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(clientRoot, ".output/playwright/report"), open: "never" }],
  ],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    // 클라이언트를 빌드해 서버가 그것을 정적으로 서빙하게 한다 — 배포와 같은 모양이다.
    command: "pnpm --filter client build && pnpm --filter server exec tsx src/index.ts",
    cwd: repoRoot,
    env: {
      ADE_WORKSPACE: path.join(import.meta.dirname, "fixture"),
      ADE_PORT: String(PORT),
      ADE_CLIENT_ROOT: path.join(repoRoot, CLIENT_DIST),
    },
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
