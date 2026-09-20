import { spawnSync } from "node:child_process";
import path from "node:path";

const CLIENT_ROOT = path.resolve(import.meta.dirname, "../..");
const REPO_ROOT = path.resolve(CLIENT_ROOT, "../..");
const IMAGE = "mcr.microsoft.com/playwright:v1.63.0-noble";

const run = (file: string, args: readonly string[], cwd: string): void => {
  const { status } = spawnSync(file, args, { cwd, stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
};

run("pnpm", ["run", "build:storybook"], CLIENT_ROOT);

run(
  "docker",
  [
    "run",
    "--rm",
    "--user",
    `${String(process.getuid?.() ?? 0)}:${String(process.getgid?.() ?? 0)}`,
    "-v",
    `${REPO_ROOT}:/work`,
    "-w",
    "/work",
    "-e",
    "HOME=/tmp",
    IMAGE,
    "packages/client/node_modules/.bin/playwright",
    "test",
    "-c",
    "packages/client/test/vrt/vrt.config.ts",
    ...process.argv.slice(2),
  ],
  REPO_ROOT,
);
