import { spawnSync } from "node:child_process";
import { REPO_ROOT } from "./run.ts";

/**
 * **각 패키지의 `src/` 밖을 건드렸으면 PR 본문이 그것을 말해야 한다.**
 * 밖은 배치·설정·결정이라 파급이 전역이고, 승인은 PR 리뷰다 — 리뷰어가 diff를 열기 전에
 * 본문에서 "무엇이 밖이었나"를 알아야 한다.
 *
 * 여기서 보는 것은 **언급 여부**뿐이다. 설명이 타당한가는 사람이 판정한다.
 *
 * ```sh
 * PR_BODY="$(gh pr view --json body -q .body)" node ops/pipeline/outsideSrc.ts origin/main HEAD
 * ```
 */
const [base = "origin/main", head = "HEAD"] = process.argv.slice(2);

/** `src/` 안이거나 승인이 필요 없는 임시 폴더. */
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

/**
 * 파일 이름이든 그 폴더든, 본문이 가리키면 언급된 것으로 본다.
 */
const mentioned = (file: string): boolean => {
  const parts = file.split("/");
  const candidates = [file, parts.at(-1) ?? file];
  for (let depth = parts.length - 1; depth > 0; depth -= 1) candidates.push(`${parts.slice(0, depth).join("/")}/`);

  // `docs/` 최상위 문서는 확장자 없이 부른다 — `concept`.
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
