import path from "node:path";

/**
 * 패키지의 `src/` 밖을 바꾸려 하면 사용자에게 묻는다(→ ADR 0003).
 *
 * **에이전트가 우회할 수 없는 유일한 자리**라서 여기 있다. `pre-commit`은 저장소 안의 기제라
 * `--no-verify` 한 번이면 뚫리지만, `PreToolUse`는 Claude Code가 도구 호출을 가로채는 것이라
 * "가로채이지 않기"를 고를 수 없다. 사람은 자기 터미널에서 일하면 애초에 안 걸린다.
 *
 * **막지 않고 묻는다.** 실측으로 커밋 54개 중 밖을 안 건드린 것이 0개라, 막으면 모든
 * 라운드가 선다. 물으면 사람이 그 자리에서 승인한다 — 에이전트는 스스로 승인할 수 없다.
 */

/** 자유롭게 쓸 수 있는 자리. 나머지는 전부 묻는다. */
const FREE = [/^packages\/[^/]+\/src\//u, /^\.claude\//u, /^\.output\//u];

const isFree = (relative: string): boolean => FREE.some((pattern) => pattern.test(relative));

type Input = { readonly tool_input?: { readonly file_path?: string } };

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
const input = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Input;

const file = input.tool_input?.file_path;
if (file === undefined) process.exit(0);

const relative = path.relative(process.cwd(), file);
// 저장소 밖(절대경로·`../`)도 묻는다 — 홈 디렉터리를 건드리는 것이 가장 놀랍다.
if (isFree(relative) && !relative.startsWith("..")) process.exit(0);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason:
      `\`${relative}\`는 \`packages/*/src/\` 밖입니다 — 배치·설정·결정이라 파급이 전역입니다(ADR 0003). 의도한 변경인지 확인해 주세요.`,
  },
}));
