import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/** 저장소 루트. 이 스위트는 저장소 자신의 모양을 본다. */
export const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

/**
 * **추적되는 파일만 본다.** `git ls-files`가 경계다 — 추적하지 않는 것(`USER_NOTE.md`,
 * 빌드 산출물, 로컬 메모)은 저장소의 모양이 아니고, 있다가 없어도 검사가 흔들려선 안 된다.
 */
export const TRACKED: readonly string[] = (() => {
  const { status, stdout } = spawnSync("git", ["ls-files"], { cwd: REPO_ROOT, encoding: "utf8" });
  if (status !== 0) throw new Error("git ls-files 실패");
  return stdout.split("\n").filter((line) => line !== "");
})();

/** 저장소 상대 경로의 내용. */
export const read = (file: string): string => readFileSync(path.join(REPO_ROOT, file), "utf8");

/** 추적되는 마크다운 전부. */
export const MARKDOWN = TRACKED.filter((file) => file.endsWith(".md"));
