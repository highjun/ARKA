import { execFileSync } from "node:child_process";
import { statfsSync } from "node:fs";
import path from "node:path";

/**
 * **ARKA 이미지를 만드는 유일한 길.** 빌드하고, 무슨 일이 있어도 뒤를 치운다.
 *
 * 이 기계에서 `<none>` 이미지 656개(하루 224개)가 쌓여 디스크를 86%까지 밀어 올린 적이 있다.
 * 원인은 게으름이 아니라 **빌드 경로에 회수 단계가 없던 것**이라, 한 번 치우는 대신 길을 하나로 모은다.
 */

/** 남은 디스크가 이보다 적으면 빌드하지 않는다. 배포 중에 디스크가 차는 것이 느린 빌드보다 나쁘다. */
const MIN_FREE_GB = Number(process.env["ADE_MIN_FREE_GB"] ?? 20);

/**
 * 빌드 캐시로 남겨 둘 양. 이걸 안 주면 prune이 캐시를 통째로 날려 다음 빌드가 처음부터 돈다.
 *
 * 플래그가 `--keep-storage`에서 `--reserved-space`로 바뀌었다(docker 29에서 경고로 확인).
 */
const CACHE_BUDGET = process.env["ADE_CACHE_BUDGET"] ?? "20GB";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

/** 실행할 명령 한 줄. 테스트가 이 목록을 그대로 단언한다. */
export interface Command {
  readonly file: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
}

/**
 * 빌드 명령. **`DOCKER_BUILDKIT=1`을 여기서 못박는다** — 레거시 빌더가 중간 단계를 이미지로
 * 커밋하는 것이 656개 사태의 직접 원인이라, 환경변수에 맡기지 않는다.
 */
export const buildCommand = (tag: string, gitSha: string): Command => ({
  file: "docker",
  args: ["build", "-f", "ops/deploy/Dockerfile", "--build-arg", `ADE_GIT_SHA=${gitSha}`, "-t", tag, "."],
  env: { DOCKER_BUILDKIT: "1" },
});

/**
 * 이 빌드가 어느 커밋인지. **더러운 트리면 `-dirty`를 붙인다.**
 *
 * 커밋 안 된 것에서 배포하면 떠 있는 것이 이력의 어느 지점도 아니게 된다 — 실제로 한 번
 * 그랬다. 막지는 않되 **그 사실이 이미지에 남게** 한다.
 */
export const describeCommit = (rev: string, dirty: boolean): string => `${rev.slice(0, 12)}${dirty ? "-dirty" : ""}`;

const gitSha = (): string => {
  try {
    const rev = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: REPO_ROOT, encoding: "utf8" }).trim() !== "";
    return describeCommit(rev, dirty);
  } catch {
    // git이 없거나 저장소가 아니면 빈 값이다 — 빌드를 막을 이유는 없다.
    return "";
  }
};

/**
 * 회수 명령들. **`-a`를 쓰지 않는다** — 그러면 태그가 있지만 지금 안 도는 것까지 지워
 * playwright(VRT)·gitleaks(CI)·node 베이스가 함께 날아간다.
 */
export const pruneCommands = (cacheBudget: string): readonly Command[] => [
  { file: "docker", args: ["image", "prune", "-f"] },
  { file: "docker", args: ["builder", "prune", "-f", "--reserved-space", cacheBudget] },
];

/** 남은 디스크(GB). */
export const freeGb = (dir: string): number => {
  const fs = statfsSync(dir);
  return (Number(fs.bavail) * Number(fs.bsize)) / 1024 ** 3;
};

const run = ({ file, args, env }: Command): void => {
  console.error(`$ ${file} ${args.join(" ")}`);
  execFileSync(file, args, { cwd: REPO_ROOT, stdio: "inherit", env: { ...process.env, ...env } });
};

if (process.argv[1] === import.meta.filename) {
  const tag = process.argv[2] ?? "ade:latest";
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
    // **실패해도 돈다.** 실패한 빌드도 캐시를 남긴다.
    for (const command of pruneCommands(CACHE_BUDGET)) run(command);
    const after = freeGb(REPO_ROOT);
    console.error(`[빌드] 끝 — 여유 ${after.toFixed(1)}GB (${(after - before).toFixed(1)}GB 변화)`);
  }
}
