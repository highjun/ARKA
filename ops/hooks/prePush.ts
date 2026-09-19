import { readFileSync } from "node:fs";

/**
 * **`main`으로 직접 미는 것을 막는다.** 합치는 길은 PR 하나다(→ ADR 0005).
 *
 * 원래 이 자리는 GitHub 룰셋의 몫이다. 그런데 Free 요금제 + 비공개 저장소에는 룰셋도 구식
 * branch protection도 없다(2026-09-10 실측, 둘 다 403). 그래서 강제가 로컬로 내려왔다.
 *
 * `--no-verify`로 지나갈 수 있고 **그 사실이 아무 데도 남지 않는다.** 그래서 이건 방어가 아니라
 * 미끄럼 방지턱이다. 진짜 강제는 `main` 룰셋이 든다(저장소 공개 뒤 걸 수 있게 됐다).
 */

/** git이 `pre-push`에 주는 한 줄. 넷 중 셋째가 원격 쪽 ref다. */
const PROTECTED = new Set(["refs/heads/main"]);

/**
 * git이 stdin으로 준 목록에서 **보호된 ref를 향하는 것**을 골라낸다.
 *
 * 형식은 `<local ref> <local sha> <remote ref> <remote sha>`이고 한 push에 여러 줄이 온다.
 * 순수 함수로 둔다 — 훅은 손으로 돌려 보기 어려워서, 판정만이라도 테스트가 잡아야 한다.
 */
export const protectedPushes = (stdin: string): readonly string[] =>
  stdin
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(" ")[2])
    .filter((remoteRef): remoteRef is string => remoteRef !== undefined && PROTECTED.has(remoteRef));

if (process.argv[1] === import.meta.filename) {
  // fd 0을 직접 읽는다 — git이 목록을 stdin으로만 준다.
  const blocked = protectedPushes(readFileSync(0, "utf8"));
  if (blocked.length > 0) {
    console.error(`
[브랜치] ${blocked.join(", ")}로 직접 밀 수 없습니다.

합치는 길은 PR 하나입니다(→ docs/CONVENTIONS.md).

  git switch -c feat/…      작업마다 브랜치
  git push -u origin HEAD
  gh pr create              제목은 \`feat(client): 설명\` 형식

머지는 사용자가 합니다.
`);
    process.exit(1);
  }
}
