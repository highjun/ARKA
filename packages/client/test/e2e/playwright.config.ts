import path from "node:path";
import { defineConfig } from "@playwright/test";
import { CLIENT_DIST } from "../../vite.config.ts";

const clientRoot = path.resolve(import.meta.dirname, "../..");
const repoRoot = path.resolve(clientRoot, "../..");
const PORT = 5199;

const origin = process.env["ARKA_E2E_ORIGIN"];

export default defineConfig({
  timeout: 60_000,
  outputDir: path.join(clientRoot, ".output/playwright/test-results"),
  reporter: [["list"], ["html", { outputFolder: path.join(clientRoot, ".output/playwright/report"), open: "never" }]],
  use: { baseURL: origin ?? `http://127.0.0.1:${String(PORT)}` },
  ...(origin === undefined
    ? {
        webServer: {
          command: "pnpm --filter client build && pnpm --filter server exec tsx src/index.ts",
          cwd: repoRoot,
          env: {
            ARKA_WORKSPACE: path.join(import.meta.dirname, "fixture"),
            ARKA_PORT: String(PORT),
            ARKA_CLIENT_ROOT: path.join(repoRoot, CLIENT_DIST),
          },
          url: `http://127.0.0.1:${String(PORT)}/`,
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }
    : {}),
});
