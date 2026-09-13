import { spawnSync } from "node:child_process";
import path from "node:path";

/**
 * 스토리를 순회해 **이전과 같은 그림인지** 본다. 인자는 playwright로 그대로 넘어간다 —
 * 기준 이미지를 만들 때는 **스토리를 골라서** 준다:
 *
 * ```
 * pnpm --filter client test:vrt -g "workbench-shell--default" --update-snapshots
 * ```
 *
 * 전체를 한 번에 갱신하는 스크립트를 두지 않는 이유는, 기준이 **검토에서 그 스토리를 Accept할
 * 때** 만들어져야 하기 때문이다. 한 명령으로 전부 만들면 "검토 안 함"이 "승인됨"으로 기록된다.
 *
 * **Docker에서만 돈다.** 폰트 렌더링과 서브픽셀이 기계마다 달라, 호스트에서 만든 기준 이미지는
 * 다른 기계에서 무조건 깨진다 — 고정하지 않으면 기준이 아니라 소음이 된다.
 */
const CLIENT_ROOT = path.resolve(import.meta.dirname, "../..");
const REPO_ROOT = path.resolve(CLIENT_ROOT, "../..");
const IMAGE = "mcr.microsoft.com/playwright:v1.63.0-noble";

const run = (file: string, args: readonly string[], cwd: string): void => {
  const { status } = spawnSync(file, args, { cwd, stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
};

// **빌드 명령을 여기 적지 않는다** — `build:storybook`이 정본이고 Pages도 그것을 부른다.
run("pnpm", ["run", "build:storybook"], CLIENT_ROOT);

// 마운트는 이 패키지가 아니라 **저장소 루트**다. pnpm이 `node_modules/@playwright/test`를 루트의
// `.pnpm` 저장소로 심볼릭 링크하므로, 패키지만 마운트하면 컨테이너 안에서 끊어진 링크가 된다.
// 그래서 바이너리는 패키지 것이고 작업 디렉터리는 루트다.
run("docker", [
  "run", "--rm",
  "--user", `${String(process.getuid?.() ?? 0)}:${String(process.getgid?.() ?? 0)}`,
  "-v", `${REPO_ROOT}:/work`, "-w", "/work", "-e", "HOME=/tmp", IMAGE,
  "packages/client/node_modules/.bin/playwright", "test",
  "-c", "packages/client/test/vrt/vrt.config.ts",
  ...process.argv.slice(2),
], REPO_ROOT);
