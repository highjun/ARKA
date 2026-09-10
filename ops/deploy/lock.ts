import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * **리소스 이름을 잠근다** — 파일도 디렉터리도 아니다.
 *
 * 막으려는 것은 "두 배포가 같은 터널이나 같은 호스트 이름을 동시에 건드리는 것"이다.
 * 서로 다른 앱은 키가 달라 그대로 병렬로 간다.
 */

/** 파일 이름에 넣을 수 있게 좁힌다 — 호스트 이름의 점이 그대로 들어가지 않게. */
const safe = (key: string): string => key.replace(/[^a-z0-9-]/giu, "_");

/**
 * 잠긴 주인이 아직 살아 있는지 본다.
 *
 * `kill(pid, 0)`은 신호를 보내지 않고 존재만 확인한다. 크래시로 `release`를 못 부른 락을
 * 영원히 남기지 않으려는 것이다.
 */
const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * 잠근다. **기다리지 않는다** — 이미 잡혀 있으면 즉시 던진다.
 *
 * `wx`는 커널이 원자적으로 보장하므로 검사와 생성 사이에 틈이 없다. 재시도나 타임아웃을
 * 두지 않는 이유는 배포가 겹치면 **줄 세우는 것보다 서는 편이** 안전해서다.
 */
export const acquire = (dir: string, key: string): void => {
  const file = path.join(dir, `${safe(key)}.lock`);
  mkdirSync(dir, { recursive: true });
  try {
    writeFileSync(file, String(process.pid), { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const owner = Number(readFileSync(file, "utf8").trim());
    if (Number.isFinite(owner) && alive(owner)) {
      throw new Error(`${key}이(가) 다른 배포(pid ${String(owner)})에 잡혀 있습니다`, { cause: error });
    }
    // 주인이 죽었다 — 낡은 락을 회수하고 다시 잡는다.
    rmSync(file, { force: true });
    writeFileSync(file, String(process.pid), { flag: "wx" });
  }
};

/** 푼다. 없어도 조용히 지나간다 — 실패 경로에서 두 번 불릴 수 있다. */
export const release = (dir: string, key: string): void => {
  rmSync(path.join(dir, `${safe(key)}.lock`), { force: true });
};
