import { execFileSync } from "node:child_process";
import { statfsSync } from "node:fs";
import path from "node:path";

const MIN_FREE_GB = Number(process.env["ARKA_MIN_FREE_GB"] ?? 20);

const CACHE_BUDGET = process.env["ARKA_CACHE_BUDGET"] ?? "20GB";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

export interface Command {
  readonly file: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
}

export const buildCommand = (tag: string, gitSha: string): Command => ({
  file: "docker",
  args: ["build", "-f", "ops/deploy/Dockerfile", "--build-arg", `ARKA_GIT_SHA=${gitSha}`, "-t", tag, "."],
  env: { DOCKER_BUILDKIT: "1" },
});

export const describeCommit = (rev: string, dirty: boolean): string => `${rev.slice(0, 12)}${dirty ? "-dirty" : ""}`;

const gitSha = (): string => {
  try {
    const rev = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: REPO_ROOT, encoding: "utf8" }).trim() !== "";
    return describeCommit(rev, dirty);
  } catch {
    return "";
  }
};

export const pruneCommands = (cacheBudget: string): readonly Command[] => [
  { file: "docker", args: ["image", "prune", "-f"] },
  { file: "docker", args: ["builder", "prune", "-f", "--reserved-space", cacheBudget] },
];

export const freeGb = (dir: string): number => {
  const fs = statfsSync(dir);
  return (Number(fs.bavail) * Number(fs.bsize)) / 1024 ** 3;
};

const run = ({ file, args, env }: Command): void => {
  console.error(`$ ${file} ${args.join(" ")}`);
  execFileSync(file, args, { cwd: REPO_ROOT, stdio: "inherit", env: { ...process.env, ...env } });
};

if (process.argv[1] === import.meta.filename) {
  const tag = process.argv[2] ?? "arka:latest";
  const before = freeGb(REPO_ROOT);
  console.error(`[빌드] ${tag} — 시작 시 여유 ${before.toFixed(1)}GB`);

  if (before < MIN_FREE_GB) {
    console.error(`
[디스크] 여유가 ${before.toFixed(1)}GB로 하한(${String(MIN_FREE_GB)}GB) 아래입니다. 빌드하지 않습니다.

  docker image prune -f
  docker builder prune -f --reserved-space ${CACHE_BUDGET}

\`-a\`는 붙이지 마세요 — 지금 안 도는 playwright·gitleaks·node 베이스까지 지웁니다.
`);
    process.exit(1);
  }

  try {
    run(buildCommand(tag, gitSha()));
  } finally {
    for (const command of pruneCommands(CACHE_BUDGET)) run(command);
    const after = freeGb(REPO_ROOT);
    console.error(`[빌드] 끝 — 여유 ${after.toFixed(1)}GB (${(after - before).toFixed(1)}GB 변화)`);
  }
}
