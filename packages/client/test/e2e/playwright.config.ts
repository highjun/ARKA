import path from "node:path";
import { defineConfig } from "@playwright/test";
import { CLIENT_DIST } from "../../vite.config.ts";

const clientRoot = path.resolve(import.meta.dirname, "../..");
const repoRoot = path.resolve(clientRoot, "../..");
const PORT = 5199;

export default defineConfig({
  timeout: 60_000,
  outputDir: path.join(clientRoot, ".output/playwright/test-results"),
  reporter: [["list"], ["html", { outputFolder: path.join(clientRoot, ".output/playwright/report"), open: "never" }]],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: "pnpm --filter client build && pnpm --filter server exec tsx src/index.ts",
    cwd: repoRoot,
    env: {
      ARKA_WORKSPACE: path.join(import.meta.dirname, "fixture"),
      ARKA_PORT: String(PORT),
      ARKA_CLIENT_ROOT: path.join(repoRoot, CLIENT_DIST),
      ARKA_DATA_DIR: path.join(repoRoot, ".output/e2e-data"),
    },
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
