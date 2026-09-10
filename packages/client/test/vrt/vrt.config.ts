import path from "node:path";
import { defineConfig } from "@playwright/test";

const clientRoot = path.resolve(import.meta.dirname, "../..");
const repoRoot = path.resolve(clientRoot, "../..");
const PORT = 6008;

/**
 * 빌드된 정적 스토리북이 놓이는 자리(이 패키지 기준).
 *
 * **여기가 이 값의 유일한 출처다.** 스토리북을 빌드하는 `run.ts`, 그것을 띄우는 아래 `webServer`,
 * 목록을 읽는 `stories.spec.ts` 셋이 같은 값을 봐야 한다.
 */
export const STORYBOOK_STATIC = ".output/storybook-static";

/**
 * 스토리 하나하나를 그려 **이전과 같은 그림인지** 본다. E2E(`../e2e/`)와 목적이 다르다 —
 * 저쪽은 "동작하는가", 여기는 "모양이 변했는가"다.
 *
 * **Docker에서만 돌린다**(`pnpm --filter client test:vrt` → `run.ts`). 폰트 렌더링과 서브픽셀이 기계마다 달라
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
    // 이미 빌드된 정적 스토리북을 띄운다 — 빌드는 `run.ts`가 먼저 한다.
    // `http-server`는 client의 devDependency다 — cwd가 이 패키지여야 바이너리를 찾는다.
    command: `node_modules/.bin/http-server ${STORYBOOK_STATIC} -p ${String(PORT)} -s`,
    cwd: clientRoot,
    url: `http://127.0.0.1:${PORT}/index.json`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
