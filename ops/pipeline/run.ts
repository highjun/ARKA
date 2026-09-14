import { spawnSync } from "node:child_process";
import path from "node:path";

/** 저장소 루트. 파이프라인은 어디서 불려도 같은 자리에서 돌아야 한다. */
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

/**
 * 한 단계를 돌리고, 실패하면 **거기서 멈춘다.**
 *
 * 뒤 단계를 계속 돌리지 않는 이유는 잡음 때문이다 — 타입이 깨진 코드의 린트 오류와 테스트
 * 실패는 대부분 그 타입 오류의 그림자라, 함께 쏟아지면 원인이 가려진다.
 */
export const step = (...command: readonly string[]): void => {
  const [file, ...args] = command;
  if (file === undefined) throw new Error("빈 명령");
  const { status } = spawnSync(file, args, { cwd: REPO_ROOT, stdio: "inherit", shell: false });
  if (status !== 0) {
    console.error(`\n실패: ${command.join(" ")}`);
    process.exit(status ?? 1);
  }
};
