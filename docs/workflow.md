# 작업 흐름

GitHub Flow다. `main` 하나가 언제나 배포 가능한 상태고, 나머지는 전부 짧게 사는 브랜치다.
왜 이렇게 정했는지는 [ADR 0005](adr/0005-ci-gate.md)에 있다.

## 한 바퀴

```sh
git switch -c feat/검색-패널        # main에서 딴다
# … 작업 …
pnpm --filter ops check             # 라운드마다
git push -u origin HEAD
gh pr create                        # 제목은 아래 형식으로
```

- **`main`에 직접 커밋하거나 푸시하지 않는다.** 작업마다 브랜치를 만든다(`feat/…`, `fix/…`).
- **PR로만 합친다.** 머지는 **squash**고, 머지 후 브랜치는 자동으로 지워진다.
- PR 본문에는 무엇을 왜 바꿨는지, 어떻게 확인했는지를 쓴다.
- **머지는 사용자가 한다.**

## PR 제목

**squash merge라서 PR 제목이 그대로 `main`의 커밋 메시지가 된다.** 이력에 남는 것은
개별 커밋이 아니라 이 한 줄이다. 그래서 커밋이 아니라 제목을 검사한다.

```text
<타입>(<scope>): <한글 설명>
```

| 자리 | 값 |
| --- | --- |
| 타입 | `feat` `fix` `refactor` `perf` `docs` `test` `build` `ci` `chore` `revert` |
| scope | **선택.** 쓴다면 `contracts` `client` `server` `ops` `repo` 중 하나 |
| 설명 | 한글. 마침표를 찍지 않는다. 제목 전체가 **72자**를 넘지 않는다 |

```text
feat(client): 검색 패널을 연다
fix(server): 빈 API 키로 부팅이 죽던 것을 고친다
docs: 작업 흐름을 적는다
ci(repo): PR 관문을 세운다
```

브랜치 안의 개별 커밋 메시지는 그대로 한글 자연문이다 — squash되어 사라지므로 형식을 묻지 않는다. 다만 **본문에 "결정한 것 / 확인 필요"를 둔다.** 정해진 결정을 벗어난 판단은 거기에 스스로 신고한다 — 리뷰가 그 두 줄부터 읽는다.

미리 확인하려면 같은 명령을 로컬에서 부른다:

```sh
printf '%s' "feat(client): 검색 패널을 연다" | pnpm --filter ops exec commitlint
```

## CI가 하는 일

**워크플로는 둘이다.** `ci.yml`의 잡이 `check`와 `deploy`고, `storybook.yml`이 화면을 올린다.
`check`는 룰셋의 **필수 검사 이름**이라 바꾸지 않는다.

`check`가 순서대로 도는 것과, 로컬에서 같은 것을 부르는 법:

| 단계 | 로컬에서 같은 것 |
| --- | --- |
| typecheck → lint → test:unit → test:integration → build | `pnpm --filter ops check` — **CI가 부르는 것이 이 명령 그대로다** |
| PR 제목 형식(PR일 때만) | `printf '%s' "제목" \| pnpm --filter ops exec commitlint` |
| 워크플로가 말이 되나 | `docker run --rm -v "$PWD:/repo:ro" -w /repo rhysd/actionlint:1.7.7 -no-color` |
| `src/` 밖 변경이 PR 본문에 적혀 있나(PR일 때만) | `PR_BODY="$(gh pr view --json body -q .body)" node ops/pipeline/outsideSrc.ts origin/main HEAD` |
| 새 커밋에 시크릿이 있는지 | `docker run --rm -v "$PWD:/repo:ro" zricethezav/gitleaks:v8.30.1 git /repo --gitleaks-ignore-path /repo/ops/.gitleaksignore --redact --no-banner` |
| 이미지를 굽는다 | `node ops/deploy/build.ts arka:local` |
| 그 이미지가 뜨는가 | `ARKA_UID=$(id -u) ARKA_GID=$(id -g) ARKA_IMAGE=arka:local docker compose -f ops/deploy/compose.yml --env-file ops/deploy/.env.ci up -d --no-build --wait` |
| Playwright 13개 | `pnpm --filter client run test:e2e` |

**여기서 굽는 이미지가 그대로 배포된다.** `main`이면 `check`가 그것을 GHCR에 올리고 `deploy`는
굽지 않고 당겨서 띄운다 — 검사한 산출물과 뜨는 산출물이 같아야 하기 때문이다.

**CI에만 있는 검사를 만들지 않는다.** 빨간불은 로컬에서 같은 한 줄로 재현된다.
**CI가 실패하면 같은 브랜치에서 고쳐 다시 푸시한다. CI 설정을 바꿔서 통과시키지 않는다.**

**PR 본문이나 제목만 고치면 검사가 다시 돌지 않는다.** `edited` 이벤트를 받지 않기 때문이다 —
받으면 그 이벤트가 돌던 진짜 검사를 취소하고 그 자리를 대신해 관문이 조용히 빈다(2026-09-13 실측).
제목을 고쳤으면 push하거나 PR을 닫았다 연다.

## 화면을 어떻게 보나

**PR마다 스토리북이 올라간다.** 봇이 링크를 코멘트로 달고 갱신한다. PR을 닫으면 그 폴더를 지운다.

| | |
| --- | --- |
| `main` | `highjun.github.io/ARKASHIC/` |
| PR | `highjun.github.io/ARKASHIC/pr-<번호>/` |

**PR별 앱 미리보기는 없다.** 예전에는 사용자 기계에 띄웠는데 터널·DNS·Access를 PR마다 만들고 지우는
자체 도구가 배포 코드의 대부분이었다(2026-09-13 걷어냈다). 지금은 이렇게 나눠 본다 —
화면은 스토리북이, 부팅은 `check`의 컨테이너 단계가, 동작은 e2e 13개가 본다.

**앱 전체를 만져 봐야 하면 Codespaces로 그 브랜치를 띄운다**(→ [`.devcontainer/README.md`](../.devcontainer/README.md)).
포트가 기본 비공개라 GitHub에 로그인한 본인만 닿는다 — 인증이 없는 앱을 공개 URL에 두지 않는다.

## 배포

**`main`에 머지하면 실배포에 올라간다.** 머지가 곧 배포다.

`check`가 통과한 뒤에만 돌고, 마지막에 익명 접근이 Access에 막히는지 확인한다. 실패하면 로그와 되돌리는 명령이 함께 남는다.

배포 잡이 하는 것은 셋이다 — 이미지를 굽고(`build.ts`), **CI가 검사한 것과 같은 compose 파일**로
올리고, 익명 스모크를 돌린다. 터널·인그레스·DNS는 코드가 아니라 Cloudflare 대시보드가 든다.

서버를 다시 세우거나 장애를 짚는 절차는 [operations.md](operations.md)에 있다.
왜 이 모양인지는 [ADR 0006](adr/0006-deploy-shape.md)에 있다.

### 아직 CI에 없는 것

- **VRT** — 기준 이미지는 **검토에서 그 스토리를 Accept할 때 하나씩** 만든다
  (`CONVENTIONS.md`의 테스트 절). 아직 승인된 것이 없어 전부 건너뛴다. 승인이 쌓이면
  관문으로 올린다([TASK-53](tasks/0053.md)).
- **Docker 경계 스모크**(`pnpm --filter ops test:smoke`) — `check`의 컨테이너 단계와 겹치면서 느리다.

둘 다 `pnpm --filter ops verify`에는 그대로 들어 있다.
