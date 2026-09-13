# ARKASHIC — 에이전트 작업 규칙

규칙의 본문은 [CONVENTIONS.md](docs/CONVENTIONS.md)다. 여기는 그 파일을 읽으라는 지시와, 매 라운드 반복되는 절차만 둔다.

## 시작할 때

1. `docs/CONVENTIONS.md`를 읽는다. 왜 그렇게 정했는지는 `docs/adr/`에 있다.
2. 할 일은 `docs/tasks/`에 있다 — 번호 파일 하나에 하나(`0040.md`). 새 할 일은 `pnpm run task create "<제목>"`으로 남기고, 시작하면 `status: In Progress`, 끝나면 `Done`으로 옮긴다. 목록은 `pnpm run task list`가 머리말에서 **생성**한다 — 유지하는 목록은 낡는다. 산문 백로그를 다른 문서에 쌓지 않는다.
3. 사용자만 할 수 있는 일(sudo, 클라우드 콘솔, 비밀값)은 `docs/USER_NOTE.md` 맨 위 "사용자가 해야 할 일"에 적는다. **이 파일은 추적하지 않는다** — 사용자 개인 메모라서다. 규칙이 될 내용은 `CONVENTIONS.md`나 ADR로 옮긴다.

## 라운드

- **한 라운드 = 한 관심사 = 한 커밋.** 스키마·린트·테스트·문서는 각각 다른 라운드다.
- 계약(타입·인터페이스)을 먼저 커밋하고 구현을 다음 커밋으로 낸다 — 리뷰 지점을 만든다.
- 구조 결정은 VSCode의 대응 개념(contribution point·command·service·extension host)을 따르고 ADR로 남긴다.
- 정해진 결정을 벗어난 판단은 커밋 메시지의 "확인 필요"에 스스로 신고한다.

## `packages/*/src/` 밖

- 밖은 배치·설정·결정이라 파급이 전역이다. **사용자가 명시적으로 지정하지 않으면 건드리지 않는다.** → [ADR 0003](docs/adr/0003-approval-outside-src.md)
- 밖을 건드린 라운드도 다른 라운드와 같이 브랜치 → PR로 낸다. **사용자가 PR을 승인해야 `main`에 합쳐진다.** 에이전트는 자기 PR을 승인하거나 합치지 않는다.

## 제출 전

```
pnpm --filter ops check      라운드마다
pnpm --filter ops verify     내보내기 전에
```

**파이프라인은 `ops/pipeline/`이 든다** — `check.ts`·`verify.ts`. 루트 `package.json`에는 단일 단계만 있다: JSON이라 왜 그 순서인지 적을 자리가 없고, 타입 검사도 린트도 안 받는다. `check`는 typecheck → lint → test 순서고 앞에서 걸리면 뒤를 안 돌린다.

`verify`는 `check` + 빌드 + E2E + VRT + Docker 경계 스모크다. **병합 전 강제는 CI가 들고(→ [ADR 0005](docs/adr/0005-ci-gate.md)), `verify`는 내보내기 전 손에 남는다** — CI에 아직 없는 VRT와 `ops/deploy/smoke.ts`가 여기에만 있다. 특히 스모크는 빈 컨테이너에서 `pnpm install --frozen-lockfile`부터 다시 하므로 "내 기계에서만 되는 것"을 잡는다. 몇 분 걸리니 라운드마다 돌리지 않는다.

- 새 실수 패턴을 발견하면 지적하지 말고 린트 규칙으로 만든다. 규칙 구현은 `ops/lint/rules/`에, 켜는 자리는 **그 규칙이 다스리는 패키지의 `eslint.config.ts`**다. 규칙에는 `message`로 대안을 적고 `ops/lint/rules/*.test.ts`에 valid/invalid를 둔다.
- 커밋 메시지는 한글 자연문. 첫 줄은 무엇을 왜 했는지, 본문에 "결정한 것 / 확인 필요".

## 작업 흐름

전체는 [docs/workflow.md](docs/workflow.md)에 있다. 매번 지켜야 하는 것만 여기 둔다.

- **`main`에서 직접 커밋하거나 푸시하지 않는다.** 작업마다 브랜치를 만든다(`feat/…`, `fix/…`).
- 작업이 끝나면 브랜치를 푸시하고 `gh pr create`로 PR을 연다. **PR 제목은 Conventional Commits 형식**(`feat(client): 검색 패널을 연다`)이다 — squash merge라 이 한 줄이 `main`의 커밋 메시지가 된다.
- PR 본문에는 무엇을 왜 바꿨는지, 어떻게 확인했는지를 쓴다.
- **CI가 실패하면 같은 브랜치에서 고쳐 다시 푸시한다. CI 설정을 바꿔서 통과시키지 않는다.**
- **`.github/`·`ops/deploy/`·`.env.*`는 사용자 확인 없이 수정하지 않는다.**
- **머지는 사용자가 한다. 그리고 `main` 머지는 곧 `실배포 호스트` 배포다** → [docs/operations.md](docs/operations.md).
- PR을 열면 사용자의 기계에 미리보기가 뜬다(`pr-<번호>-arka.…`). 동시에 다섯 개까지다.
