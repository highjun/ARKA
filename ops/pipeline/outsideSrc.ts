import { spawnSync } from "node:child_process";
import { REPO_ROOT } from "./run.ts";

const [base = "origin/main", head = "HEAD"] = process.argv.slice(2);

const INSIDE = /^packages\/[^/]+\/src\//u;
const TEMPORARY = /^(?:\.claude|\.output)\//u;

const changed = (): readonly string[] => {
  const { status, stdout } = spawnSync("git", ["diff", "--name-only", `${base}...${head}`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (status !== 0) throw new Error(`git diff 실패: ${base}...${head}`);
  return stdout.split("\n").filter((line) => line !== "");
};

const outside = changed().filter((file) => !INSIDE.test(file) && !TEMPORARY.test(file));
if (outside.length === 0) {
  console.log("`src/` 밖 변경이 없습니다.");
  process.exit(0);
}

const body = process.env["PR_BODY"] ?? "";

const mentioned = (file: string): boolean => {
  const parts = file.split("/");
  const candidates = [file, parts.at(-1) ?? file];
  for (let depth = parts.length - 1; depth > 0; depth -= 1) candidates.push(`${parts.slice(0, depth).join("/")}/`);

  const doc = /^docs\/(?<name>[^/]+)\.md$/u.exec(file)?.groups?.["name"];
  if (doc !== undefined) candidates.push(doc);

  return candidates.some((candidate) => candidate !== "" && body.includes(candidate));
};

const silent = outside.filter((file) => !mentioned(file));

console.log(`\`src/\` 밖 변경 ${outside.length}개:`);
for (const file of outside) console.log(`  ${silent.includes(file) ? "✗" : "✓"} ${file}`);

if (silent.length > 0) {
  console.error(`\nPR 본문이 위 ✗ ${silent.length}개를 말하지 않습니다 — 무엇을 왜 바꿨는지 본문에 적으세요.`);
  process.exit(1);
}
