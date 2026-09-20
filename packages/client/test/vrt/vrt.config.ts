import path from "node:path";
import { defineConfig } from "@playwright/test";

const clientRoot = path.resolve(import.meta.dirname, "../..");
const repoRoot = path.resolve(clientRoot, "../..");
const PORT = 6008;

export const STORYBOOK_STATIC = ".output/storybook-static";

export default defineConfig({
  testDir: path.join(clientRoot, "test/vrt"),
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  outputDir: path.join(repoRoot, ".output/vrt/test-results"),
  reporter: [["list"], ["html", { outputFolder: path.join(repoRoot, ".output/vrt/report"), open: "never" }]],
  updateSnapshots: "none",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: `node_modules/.bin/http-server ${STORYBOOK_STATIC} -p ${String(PORT)} -s`,
    cwd: clientRoot,
    url: `http://127.0.0.1:${PORT}/index.json`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
