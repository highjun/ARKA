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

PR을 열면 다섯 잡이 돈다. 전부 로컬에서 부를 수 있는 명령이다 — **CI에만 있는 검사를 만들지 않는다.**

| 잡 | 하는 일 | 로컬에서 같은 것 |
|---|---|---|
| `check` | lint → typecheck → test → build | `pnpm --filter ops check` + `pnpm -r --if-present run build` |
| `container` | 이미지를 빌드해 실제로 띄우고 `/api/health`를 기다린다 | `ADE_UID=$(id -u) ADE_GID=$(id -g) docker compose -p ci -f ops/deploy/compose.yml --env-file ops/deploy/.env.ci up -d --build --wait` |
| `e2e` | Playwright 13개 | `pnpm --filter client run test:e2e` |
| `pr-title` | 제목 형식 | 위의 `commitlint` 한 줄 |
| `secrets` | 새 커밋에 시크릿이 있는지 | `docker run --rm -v "$PWD:/repo:ro" zricethezav/gitleaks:v8.30.1 git /repo -i /repo/ops/.gitleaksignore --redact` |

**CI가 실패하면 같은 브랜치에서 고쳐 다시 푸시한다. CI 설정을 바꿔서 통과시키지 않는다.**

### 아직 CI에 없는 것

- **VRT** — 기준 이미지가 낡아 빨간 상태다([TASK-35](tasks/0035.md)). 초록으로 만든 뒤에 넣는다.
- **Docker 경계 스모크**(`pnpm --filter ops test:smoke`) — `container` 잡과 겹치면서 느리다.

둘 다 `pnpm --filter ops verify`에는 그대로 들어 있다. **내보내기 전에는 여전히 손으로 한 번 돈다.**
