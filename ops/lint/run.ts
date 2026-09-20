import { spawnSync } from "node:child_process";
import path from "node:path";

/**
 * 작업장 자신과 **저장소 루트**를 검사한다.
 *
 * 루트를 따로 부르는 이유는 ESLint의 **base path가 실행 cwd**이기 때문이다(2026-09-10 실측).
 * `--config ../eslint.config.ts`로 가리켜도 cwd가 `ops/`면 루트 파일은 "outside of base path"로
 * 건너뛴다. 그래서 cwd를 루트로 두고 부른다.
 *
 * 바이너리는 이 패키지의 것을 쓴다(`pnpm run`이 `ops/node_modules/.bin`을 PATH에 넣는다) —
 * 그래서 루트 `package.json`은 `devDependencies` 없이 비어 있는 채로 둔다.
 */
const OPS_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(OPS_ROOT, "..");

const lint = (args: readonly string[], cwd: string): void => {
  const { status } = spawnSync("eslint", args, { cwd, stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
};

/*
 * **`--max-warnings 0`이 없으면 `warn` 규칙은 장식이다** — 종료 코드가 0이라 관문이 초록이다
 * (2026-09-14 실측: 이 저장소에 `warn`이 셋 있었고 전부 통과 대상이었다). 편집기에서 노란 줄로
 * 남는 구분은 그대로 두고, 관문에서만 막는다.
 */
const MAX_WARNINGS = ["--max-warnings", "0"];

lint([".", ...MAX_WARNINGS], OPS_ROOT);
lint(["--config", "eslint.config.ts", "tsconfig.json", ...MAX_WARNINGS], REPO_ROOT);

/*
 * **마크다운도 여기서 본다.** 2026-09-14까지 `docs/**`·`README`·`CLAUDE.md`는 기계 검사가
 * 0건이었다. 대상 글롭과 끈 규칙의 이유는 `ops/.markdownlint-cli2.jsonc`가 적는다.
 */
const run = (file: string, args: readonly string[]): void => {
  const { status } = spawnSync(file, args, { cwd: REPO_ROOT, stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
};

run("markdownlint-cli2", ["--config", "ops/.markdownlint-cli2.jsonc"]);

/*
 * **코드의 모양**. `--check`만 한다 — 고치는 것은 `pnpm --filter ops run format`이고,
 * 관문이 남의 파일을 조용히 고쳐서는 안 된다. 마크다운은 대상이 아니다(`.prettierignore`).
 */
run("prettier", ["--config", "ops/prettier.config.ts", "--check", "--log-level", "warn", "."]);
