import { execFileSync } from "node:child_process";

/**
 * 패키지의 `src/` 밖에서 일어난 변경을 커밋 때 **드러낸다. 막지 않는다.**
 *
 * 밖에 있는 것은 배치·설정·결정이라 파급이 전역이다(→ ADR 0003). 그런데 실측으로 이 저장소의
 * 커밋 54개 중 밖을 안 건드린 것이 **0개**라, 막으면 모든 라운드가 선다. 전건 위반인 규칙은
 * 규칙이 아니라 백로그다.
 *
 * **막는 대신 세어 보여준다.** 이 저장소가 실제로 겪은 사고는 `git add -A`가 의도하지 않은 것을
 * 쓸어담은 것 세 번이었고(추적된 산출물 5.8MB, 문서 삭제, 개인 메모), 셋 다 이 자리에서 눈에
 * 띄었을 것이다.
 *
 * **강제가 아니다.** `--no-verify` 한 번이면 뚫리고, 셸로 고친 것은 스테이지하기 전까지 보이지도
 * 않는다. 진짜 강제는 저장소 밖에만 있다(managed settings·OS 권한) — 사용자만 설치할 수 있다.
 */

/** 자유롭게 바꾸는 자리. `.claude/`·`.output/`은 도구가 만드는 곳이라 세지 않는다. */
const FREE = [/^packages\/[^/]+\/src\//u, /^\.claude\//u, /^\.output\//u];

const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const outside = staged.filter((file) => !FREE.some((pattern) => pattern.test(file)));

if (outside.length > 0) {
  console.warn(`\n[범위] 패키지의 \`src/\` 밖이 ${String(outside.length)}개 스테이지됐습니다 — 이번 라운드의 관심사가 맞습니까?`);
  for (const file of outside.slice(0, 10)) console.warn(`  ${file}`);
  if (outside.length > 10) console.warn(`  … 그리고 ${String(outside.length - 10)}개 더`);
  console.warn("");
}
