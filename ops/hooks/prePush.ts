import { readFileSync } from "node:fs";

const PROTECTED = new Set(["refs/heads/main"]);

export const protectedPushes = (stdin: string): readonly string[] =>
  stdin
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(" ")[2])
    .filter((remoteRef): remoteRef is string => remoteRef !== undefined && PROTECTED.has(remoteRef));

if (process.argv[1] === import.meta.filename) {
  const blocked = protectedPushes(readFileSync(0, "utf8"));
  if (blocked.length > 0) {
    console.error(`
[브랜치] ${blocked.join(", ")}로 직접 밀 수 없습니다.

합치는 길은 PR 하나입니다.

  git switch -c feat/…      작업마다 브랜치
  git push -u origin HEAD
  gh pr create              제목은 \`feat(client): 설명\` 형식

머지는 사용자가 합니다.
`);
    process.exit(1);
  }
}
