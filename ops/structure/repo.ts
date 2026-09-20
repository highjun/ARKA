import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

export const TRACKED: readonly string[] = (() => {
  const { status, stdout } = spawnSync("git", ["ls-files"], { cwd: REPO_ROOT, encoding: "utf8" });
  if (status !== 0) throw new Error("git ls-files 실패");
  return stdout.split("\n").filter((line) => line !== "");
})();

export const read = (file: string): string => readFileSync(path.join(REPO_ROOT, file), "utf8");

export const MARKDOWN = TRACKED.filter((file) => file.endsWith(".md"));
