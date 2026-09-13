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

```
<타입>(<scope>): <한글 설명>
```

| 자리 | 값 |
|---|---|
| 타입 | `feat` `fix` `refactor` `perf` `docs` `test` `build` `ci` `chore` `revert` |
| scope | **선택.** 쓴다면 `contracts` `client` `server` `ops` `repo` 중 하나 |
| 설명 | 한글. 마침표를 찍지 않는다. 제목 전체가 **72자**를 넘지 않는다 |

```
feat(client): 검색 패널을 연다
fix(server): 빈 API 키로 부팅이 죽던 것을 고친다
docs: 작업 흐름을 적는다
ci(repo): PR 관문을 세운다
```

브랜치 안의 개별 커밋 메시지는 그대로 한글 자연문이다 — squash되어 사라지므로 형식을 묻지 않는다.

미리 확인하려면 같은 명령을 로컬에서 부른다:

```sh
printf '%s' "feat(client): 검색 패널을 연다" | pnpm --filter ops exec commitlint
```

## CI가 하는 일

**잡은 둘이다.** PR에는 `check` 하나가 돌고, `main`에 들어가면 그 뒤에 `deploy`가 붙는다.
`check`는 룰셋의 **필수 검사 이름**이라 바꾸지 않는다.

`check`가 순서대로 도는 것과, 로컬에서 같은 것을 부르는 법:

| 단계 | 로컬에서 같은 것 |
|---|---|
| lint → typecheck → test → build | `pnpm -r --if-present run lint` … |
| PR 제목 형식(PR일 때만) | `printf '%s' "제목" \| pnpm --filter ops exec commitlint` |
| 새 커밋에 시크릿이 있는지 | `docker run --rm -v "$PWD:/repo:ro" zricethezav/gitleaks:v8.30.1 git /repo --gitleaks-ignore-path /repo/ops/.gitleaksignore --redact --no-banner` |
| 컨테이너가 뜨는가 | `ARKA_UID=$(id -u) ARKA_GID=$(id -g) docker compose -f ops/deploy/compose.yml --env-file ops/deploy/.env.ci up -d --build --wait` |
| Playwright 13개 | `pnpm --filter client run test:e2e` |

**CI에만 있는 검사를 만들지 않는다.** 빨간불은 로컬에서 같은 한 줄로 재현된다.
**CI가 실패하면 같은 브랜치에서 고쳐 다시 푸시한다. CI 설정을 바꿔서 통과시키지 않는다.**

**PR 본문이나 제목만 고치면 검사가 다시 돌지 않는다.** `edited` 이벤트를 받지 않기 때문이다 —
받으면 그 이벤트가 돌던 진짜 검사를 취소하고 그 자리를 대신해 관문이 조용히 빈다(2026-09-13 실측).
제목을 고쳤으면 push하거나 PR을 닫았다 연다.

## 미리보기

PR별 미리보기는 **없다.** 2026-09-13에 걷어냈다 — PR마다 이 기계에 터널·DNS·Access 앱을 만들고 지우는
자체 도구가 배포 코드의 대부분이었고, 관례에 없는 것이었다. 화면 검토는 Storybook 호스팅으로 간다(별도 라운드).

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
