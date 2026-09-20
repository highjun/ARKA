import { spawnSync } from "node:child_process";
import path from "node:path";

export const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

export const step = (...command: readonly string[]): void => {
  const [file, ...args] = command;
  if (file === undefined) throw new Error("빈 명령");
  const { status } = spawnSync(file, args, { cwd: REPO_ROOT, stdio: "inherit", shell: false });
  if (status !== 0) {
    console.error(`\n실패: ${command.join(" ")}`);
    process.exit(status ?? 1);
  }
};
