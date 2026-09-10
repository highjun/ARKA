import path from "node:path";
import { defineConfig } from "@playwright/test";

const clientRoot = path.resolve(import.meta.dirname, "../..");
const repoRoot = path.resolve(clientRoot, "../..");
const PORT = 6008;

/**
 * 스토리 하나하나를 그려 **이전과 같은 그림인지** 본다. E2E(`../e2e/`)와 목적이 다르다 —
 * 저쪽은 "동작하는가", 여기는 "모양이 변했는가"다.
 *
 * **Docker에서만 돌린다**(루트 `pnpm run vrt`). 폰트 렌더링과 서브픽셀이 기계마다 달라
 * 호스트에서 만든 기준 이미지는 다른 기계에서 무조건 깨진다 — 고정하지 않으면 기준이
 * 아니라 소음이 된다.
 */
export default defineConfig({
  testDir: path.join(clientRoot, "test/vrt"),
  // 스냅샷을 스펙 옆(`*-snapshots/`)이 아니라 한곳에 모은다. 던더 폴더는 쓰지 않는다.
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  outputDir: path.join(repoRoot, ".output/vrt/test-results"),
  reporter: [["list"], ["html", { outputFolder: path.join(repoRoot, ".output/vrt/report"), open: "never" }]],
  // 기본값('missing')이면 기준이 없는 스토리를 **조용히 찍어 기준으로 삼는다.** 아무도 안 본 그림이
  // 승인된 기준이 되는 것이라 정반대다 — 기준은 검토에서 Accept할 때 `--update-snapshots`로만 만든다.
  updateSnapshots: "none",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    // 이미 빌드된 정적 스토리북을 띄운다 — 빌드는 `pnpm run vrt`가 먼저 한다.
    command: `node_modules/.bin/http-server packages/client/.output/storybook-static -p ${String(PORT)} -s`,
    cwd: repoRoot,
    url: `http://127.0.0.1:${PORT}/index.json`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
