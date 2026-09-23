import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { STORYBOOK_STATIC } from "./vrt.config.ts";

const CLIENT_ROOT = path.resolve(import.meta.dirname, "../..");
const REPO_ROOT = path.resolve(CLIENT_ROOT, "../..");
const IMAGE = "mcr.microsoft.com/playwright:v1.63.0-noble";
const SNAPSHOTS = path.join(import.meta.dirname, "snapshots");
const REPORT = path.join(REPO_ROOT, ".output/vrt/ui.md");

type StorybookIndex = { readonly entries: Record<string, { readonly type: string }> };

const run = (file: string, args: readonly string[], cwd: string): void => {
  const { status } = spawnSync(file, args, { cwd, stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
};

const withoutBaseline = (): readonly string[] => {
  const index = JSON.parse(
    readFileSync(path.join(CLIENT_ROOT, STORYBOOK_STATIC, "index.json"), "utf8"),
  ) as StorybookIndex;
  return Object.entries(index.entries)
    .filter(([, entry]) => entry.type === "story")
    .map(([id]) => id)
    .filter((id) => !existsSync(path.join(SNAPSHOTS, `${id}.png`)))
    .sort();
};

const report = (missing: readonly string[]): string =>
  [
    `### UI — 승인된 그림이 없는 스토리 ${String(missing.length)}개`,
    "",
    "기준 이미지가 없는 스토리는 비교하지 않고 건너뛴다. 아직 사람이 본 적 없는 그림이라는 뜻이다.",
    "승인하려면 그림을 떠서 이 PR에 함께 커밋한다 —",
    "`pnpm --filter client run test:visual-regression -- --update-snapshots`",
    "",
    "<details><summary>목록</summary>",
    "",
    ...missing.map((id) => `- \`${id}\``),
    "",
    "</details>",
    "",
  ].join("\n");

run("pnpm", ["run", "build:storybook"], CLIENT_ROOT);

const missing = withoutBaseline();
mkdirSync(path.dirname(REPORT), { recursive: true });
writeFileSync(REPORT, missing.length === 0 ? "" : report(missing));
console.log(
  missing.length === 0
    ? "모든 스토리에 승인된 기준 이미지가 있다"
    : `승인된 기준 이미지가 없는 스토리 ${String(missing.length)}개 — ${REPORT}`,
);

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
