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

lint(["."], OPS_ROOT);
lint(["--config", "eslint.config.ts", "tsconfig.json"], REPO_ROOT);
