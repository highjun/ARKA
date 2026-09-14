import type { UserConfig } from "@commitlint/types";

/**
 * **PR 제목의 형식**을 검사한다. 커밋 하나하나가 아니라 PR 제목인 이유는 squash merge라서다 —
 * PR 제목이 그대로 main의 커밋 메시지가 되므로, 이력에 남는 것은 오직 그것이다.
 *
 * 서드파티 액션 대신 이걸 쓰는 이유는 **규칙이 저장소 안에 살아야** 해서다. 여기는
 * 왜 그 목록인지 주석으로 적을 수 있고, 로컬에서 같은 명령으로 재현된다:
 *
 * ```sh
 * echo "feat(client): 검색 패널을 연다" | pnpm --filter ops exec commitlint
 * ```
 */
const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // 되돌리기(`revert`)까지 포함한 열 가지. 이 저장소에 없는 타입(`style`·`wip`)은 뺐다.
    "type-enum": [2, "always", ["feat", "fix", "refactor", "perf", "docs", "test", "build", "ci", "chore", "revert"]],
    // 워크스페이스 패키지 이름과 `repo`(루트 설정·문서·`.github`)만. 오타 scope를 잡는 것이 목적이다.
    "scope-enum": [2, "always", ["contracts", "client", "server", "ops", "repo"]],
    // scope는 선택이다 — 여러 패키지에 걸친 변경에 억지로 하나를 고르게 하지 않는다.
    "scope-empty": [0],
    // **한글에는 대소문자가 없다.** 기본값(`lower-case`)을 그대로 두면 한글 제목이 전부 걸린다.
    "subject-case": [0],
    // 제목 줄이 길면 `git log --oneline`과 GitHub 목록에서 잘린다.
    "header-max-length": [2, "always", 72],
  },
};

export default config;
