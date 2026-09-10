import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * 패키지의 `src/` 밖이 스테이지되면 **커밋을 막고 사용자에게 검토를 넘긴다**(→ ADR 0003).
 *
 * 밖에 있는 것은 배치·설정·결정이라 파급이 전역이다. 이 저장소가 실제로 겪은 사고는
 * `git add -A`가 의도하지 않은 것을 쓸어담은 것 세 번이었다(추적된 산출물 5.8MB, 문서 삭제,
 * 개인 메모). 셋 다 **커밋 시점**의 사고라 여기서 섰을 것이다.
 *
 * **막는 것과 경고의 차이는 기본값이다.** 경고는 스크롤에 묻히지만, 막으면 목록을 읽고
 * 의식적으로 한 번 더 손을 대야 지나간다.
 *
 * `pre-commit`이 아니라 `commit-msg`에 있는 이유는 **우회가 트레일러**여서다 — 앞의 훅은 커밋
 * 메시지를 못 본다. 스테이지 목록은 여기서도 그대로 읽힌다.
 */

/** 자유롭게 바꾸는 자리. `.claude/`·`.output/`은 도구가 만드는 곳이라 세지 않는다. */
const FREE = [/^packages\/[^/]+\/src\//u, /^\.claude\//u, /^\.output\//u];

/**
 * 승인의 흔적. **환경변수가 아니라 트레일러인 이유는 기록에 남아서다** —
 * `git log --grep="Reviewed-by-human"`이 우회를 전부 짚는다. 환경변수는 그 순간 증발한다.
 */
const TRAILER = /^Reviewed-by-human:\s*\S/mu;

const messageFile = process.argv[2];
if (messageFile === undefined) throw new Error("커밋 메시지 파일 경로가 필요하다");

const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const outside = staged.filter((file) => !FREE.some((pattern) => pattern.test(file)));

if (outside.length === 0 || TRAILER.test(readFileSync(messageFile, "utf8"))) process.exit(0);

console.error(`\n[범위] 패키지의 \`src/\` 밖이 ${String(outside.length)}개 스테이지됐습니다.\n`);
for (const file of outside.slice(0, 20)) console.error(`  ${file}`);
if (outside.length > 20) console.error(`  … 그리고 ${String(outside.length - 20)}개 더`);
console.error(`
배치·설정·결정은 파급이 전역입니다(ADR 0003). **사용자에게 검토를 요청하세요.**
승인받았다면 누가 봤는지가 이력에 남도록 트레일러와 함께 커밋합니다:

  git commit --trailer "Reviewed-by-human: <이름>" …
`);
process.exit(1);
