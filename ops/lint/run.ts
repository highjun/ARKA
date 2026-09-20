import { spawnSync } from "node:child_process";
import path from "node:path";

const OPS_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(OPS_ROOT, "..");

const lint = (args: readonly string[], cwd: string): void => {
  const { status } = spawnSync("eslint", args, { cwd, stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
};

const MAX_WARNINGS = ["--max-warnings", "0"];

lint([".", ...MAX_WARNINGS], OPS_ROOT);
lint(["--config", "eslint.config.ts", "tsconfig.json", ...MAX_WARNINGS], REPO_ROOT);

const run = (file: string, args: readonly string[]): void => {
  const { status } = spawnSync(file, args, { cwd: REPO_ROOT, stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
};

const PRETTIER = ["--config", "ops/prettier.config.ts", "--ignore-path", "ops/.prettierignore"];

run("prettier", [...PRETTIER, "--check", "--log-level", "warn", "."]);
