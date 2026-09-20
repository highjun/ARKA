# 운영 — 이 기계에서 무엇이 어떻게 도는가

실배포는 **사용자 PC 한 대**에서 돈다. 이 문서는 그것을 다시 세우거나 고치는 사람을
위한 것이다.

```text
GitHub ──▶ self-hosted 러너 ──▶ docker compose ──▶ cloudflared 터널 ──▶ Cloudflare Access ──▶ 사람
```

## 지금 도는 것

| | |
| --- | --- |
| 실배포 | compose 프로젝트 `arka`(`arka-app` + `arka-tunnel`). 호스트 이름은 `ARKA_ORIGIN`에 있다 |
| 정본 | `ops/deploy/compose.yml` **한 장.** 로컬·CI·실배포가 같은 파일로 뜬다 |
| 이미지 | `ghcr.io/highjun/arka:<커밋 SHA>`. **CI가 굽고 검사한 그것**을 러너가 당겨 띄운다 |
| 러너 | `~/actions-runner`, 사용자 유닛 `arka-runner.service`, 라벨 `self-hosted,linux,arka` |
| 터널 | 로컬 관리형. 설정·자격증명은 `~/ARKA/secure/cloudflared/`의 파일 둘, 인그레스는 그 호스트 → `http://app:3000` |
| 값·비밀 | `~/ARKA/secure/env/arka.env`(0600) — `ARKA_ORIGIN`·`ARKA_TUNNEL_*`과 나머지 `ARKA_*` |

**스토리북은 이 기계에 없다.** GitHub Pages(`highjun.github.io/ARKASHIC/`)에 올라간다.
이 기계의 `storybook.sangjun.dev`는 **다른 프로젝트**(`arka-devkit`)의 것이다 — 이름이 비슷해 헷갈린다.

**sudo가 한 번도 필요 없다.** 전부 사용자 systemd 유닛이고(`Linger=yes`), docker는 그룹 권한으로 쓴다.

**저장소에 생성물이 없다.** 예전에는 상태 디렉터리에 만들어진 compose·manifest가 실배포의
정본이었고 리포의 `compose.yml`은 CI만 봤다 — 검사하는 것과 뜨는 것이 다른 파일이었다(2026-09-13 정리).

## 손으로 부르는 명령

```sh
set -a; . ~/ARKA/secure/env/arka.env; set +a        # 값을 셸에 푼다
C="docker compose -f ~/ARKASHIC/ops/deploy/compose.yml"

$C ps                          # 무엇이 떠 있나
$C --profile tunnel up -d --no-build --wait   # 다시 올린다(`ARKA_IMAGE`가 가리키는 이미지로)
$C logs -f app                 # 앱 로그
$C --profile tunnel down       # 내린다. `-v`를 붙이면 이름 있는 볼륨까지 지운다
```

`pnpm run deploy`는 없다 — `deploy`가 pnpm의 내장 명령이라 이름이 겹친다.

로컬에서 브라우저로 열어 보려면 포트를 더하는 override를 함께 쓴다. **실배포는 포트를 열지 않는다.**

```sh
docker compose -f ops/deploy/compose.yml -f ops/deploy/compose.local.yml up -d --build
```

## 배포

**`main`에 머지하면 배포된다.** 손으로 올리지 않는다 — 그러면 떠 있는 것이 어떤 커밋에도
대응하지 않는다.

배포 잡은 **굽지 않는다.** `check`가 구워 GHCR에 올린 바로 그 이미지를 당겨 띄우고, 익명 접근이
막히는지 본다. 검사한 산출물과 뜨는 산출물이 같아야 하기 때문이다 — 예전에는 CI가 굽고 버린 뒤
러너가 다시 구웠다.

배포 이력은 저장소의 **Environments → production**에 쌓인다. 무엇이 언제 어느 커밋으로 떴는지가
거기 남고, 배포 직전 승인을 받고 싶으면 Settings → Environments에서 스위치만 켠다.

```sh
curl -s "$ARKA_ORIGIN/api/version"   # Access 뒤라 로그인한 브라우저로 본다
```

### 아직 관문에 없는 것

- **VRT** — 기준 이미지는 **검토에서 그 스토리를 Accept할 때 하나씩** 만든다(`CONVENTIONS.md`의
  테스트 절). 아직 승인된 것이 없어 전부 건너뛴다. 승인이 쌓이면 관문으로 올린다
  ([TASK-53](tasks/0053.md)).
- **Docker 경계 스모크**(`pnpm --filter ops test:smoke`) — `check`의 컨테이너 단계와 겹치면서 느리다.

둘 다 `pnpm --filter ops verify`에는 그대로 들어 있다.

## 화면을 어떻게 보나

**PR마다 스토리북이 올라간다.** 봇이 링크를 코멘트로 달고 갱신한다. PR을 닫으면 그 폴더를 지운다.

| | |
| --- | --- |
| `main` | `highjun.github.io/ARKASHIC/` |
| PR | `highjun.github.io/ARKASHIC/pr-<번호>/` |

**PR별 앱 미리보기는 없다.** 예전에는 사용자 기계에 띄웠는데 터널·DNS·Access를 PR마다 만들고
지우는 자체 도구가 배포 코드의 대부분이었다(2026-09-13 걷어냈다). 지금은 이렇게 나눠 본다 —
화면은 스토리북이, 부팅은 `check`의 컨테이너 단계가, 동작은 e2e가 본다.

**앱 전체를 만져 봐야 하면 Codespaces로 그 브랜치를 띄운다**(→ [`.devcontainer/README.md`](../.devcontainer/README.md)).
포트가 기본 비공개라 GitHub에 로그인한 본인만 닿는다 — 인증이 없는 앱을 공개 URL에 두지 않는다.

**그림의 정본은 Figma다.** 스토리북은 코드가 그린 것을 보여 주고, Figma 시트는 그려야 할 것을
든다. 시트를 검토하는 잣대는 [figma/review-checklist.md](figma/review-checklist.md)에 있다.

### 되돌리기

**되돌릴 커밋의 SHA 태그를 당긴다.** 어느 SHA였는지는 Environments 탭이나 `git log`가 안다.

```sh
OLD=<되돌릴 커밋 SHA>
set -a; . ~/ARKA/secure/env/arka.env; set +a
docker pull "ghcr.io/highjun/arka:$OLD"
ARKA_IMAGE="ghcr.io/highjun/arka:$OLD" \
  docker compose -f ~/ARKASHIC/ops/deploy/compose.yml --profile tunnel up -d --no-build --wait
```

되돌린 상태는 **어떤 커밋에도 대응하지 않는다** — 곧바로 되돌리는 커밋을 PR로 올려 `main`을 맞춘다.

**workbench로 돌아가려면** — 그 호스트는 원래 workbench가 쓰던 자리다. 재료가 남아 있다.
그 앱은 자기 터널을 쓰므로, `cloudflared tunnel route dns --overwrite-dns <workbench터널> <호스트>`로 이름을 되돌린다.

```sh
docker compose -p workbench -f ~/.local/state/arka/deploy/workbench/docker-compose.yml up -d
```

## 터널을 다시 세우려면

**대시보드가 아니라 CLI로 한다.** 이 기계에 터널 로그인 인증서(`~/.cloudflared/cert.pem`)가 있어
에이전트가 끝까지 할 수 있다. 지금 도는 것은 **로컬 관리형** 터널이다 — 설정이 대시보드가 아니라
파일에 있고, 그 파일은 저장소 밖에 산다.

```sh
cloudflared tunnel create <이름>                 # 자격증명 JSON이 ~/.cloudflared/에 떨어진다
mv ~/.cloudflared/<터널ID>.json ~/ARKA/secure/cloudflared/ && chmod 600 ~/ARKA/secure/cloudflared/<터널ID>.json
cloudflared tunnel route dns <이름> <호스트>      # CNAME. 남의 이름을 빼앗을 때만 --overwrite-dns
```

그리고 `~/ARKA/secure/cloudflared/config.yml`을 손으로 쓴다 — `tunnel`(ID),
`credentials-file: /etc/cloudflared/creds.json`, `ingress`의 호스트 → `http://app:3000`.
마지막으로 `~/ARKA/secure/env/arka.env`의 `ARKA_TUNNEL_CONFIG`·`ARKA_TUNNEL_CREDENTIALS`가 그 둘을
가리키게 하고 위의 `up` 명령을 돌린다.

**설정을 저장소에 두지 않는 이유**는 저장소가 공개라서다. 호스트 이름과 터널 ID가 그 안에 있다.

**Access는 터널과 별개다.** 앱 이름 `arka`, 허용 이메일 하나. 터널을 갈아도 Access 앱은 그대로 있다 —
지우면 그 호스트가 무인증으로 열린다. Access 앱은 **zone 레벨**에 산다
(`/zones/{zone}/access/apps`) — **계정 레벨로 물으면 0개로 보여 무방비인 줄 알고 놀란다**(2026-09-13 실측).

## 장애가 나면 — 이 순서로 짚는다

1. **러너** — `systemctl --user status arka-runner`. GitHub 쪽은 저장소 Settings → Actions → Runners.
2. **컨테이너** — `docker compose -f ops/deploy/compose.yml ps`. 마운트가 수상하면 유령 마운트다(아래).
3. **터널** — `docker logs arka-tunnel --tail 50`. 앱이 healthy인데 밖에서 502/530이면 여기다.
4. **Access** — `node ops/deploy/anonSmoke.ts "$ARKA_ORIGIN"`. **302가 정상이다.**
   200이 나오면 문이 열린 것이니 즉시 내린다.

### 유령 마운트

바인드 마운트는 컨테이너를 **만든 시점의 inode**를 문다. 마운트 소스를 지웠다 새로 만들면
컨테이너만 빈 inode를 계속 본다 — 서비스는 응답하지만 다음 재시작에 죽는다.
`docker restart`로는 안 고쳐진다. **재생성만 고친다**: 위의 `up` 명령을 다시 돌린다.
`docker inspect arka-app --format '{{json .Mounts}}'`의 `Source`가 실재하는지로 확인한다.

## 러너를 다시 세우려면

```sh
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -sSL -o r.tar.gz https://github.com/actions/runner/releases/download/v<버전>/actions-runner-linux-x64-<버전>.tar.gz
tar xzf r.tar.gz && rm r.tar.gz
./config.sh --unattended --replace --url https://github.com/highjun/ARKASHIC \
  --token "$(gh api -X POST repos/highjun/ARKASHIC/actions/runners/registration-token --jq .token)" \
  --name "arka-$(hostname -s)" --labels self-hosted,linux,arka --work _work

cp ~/ARKASHIC/ops/deploy/systemd/arka-runner.service ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now arka-runner
```

**해제하려면** `systemctl --user disable --now arka-runner`, 그리고 저장소 설정에서 러너를 지운다.

**유닛을 멈춰도 리스너가 남는다.** 유닛이 `KillMode=process`라 systemd가 `run.sh`만 죽이고
자식 `Runner.Listener`는 고아로 살아남는다. 그 리스너가 GitHub 세션을 쥐고 있어, 새 유닛을 올리면
`A session for this runner already exists`로 30초마다 재시도만 한다(2026-09-13 실측 — 유닛 이름을
바꿀 때 겪었다). `pkill -f Runner.Listener`로 걷고 나서 새 유닛을 올린다.

## 저장소 쪽에서 필요한 것

| 무엇 | 값 |
| --- | --- |
| 러너 라벨 | `self-hosted`, `linux`, `arka` |

`main`은 룰셋이 지킨다(2026-09-13, 저장소 공개 뒤) — PR 필수, 승인 1, 코드 오너 리뷰, 필수 검사 `check`,
강제 push·삭제 금지. 에이전트 계정 `sangjun-agent`는 우회할 수 없다.

## 보안 전제 — 읽고 넘어가지 말 것

- **앱에 인증이 없다.** Cloudflare Access가 유일한 문이고, 그마저 **엣지에서** 막는다.
  이 기계에 로컬 접근이 있는 사람은 docker 네트워크로 컨테이너에 직접 닿는다.
- **실배포 워크스페이스가 `/home/highjun/ARKA`다** — `secure/`를 포함한 개인 디렉터리 전체다.
  Access 정책의 허용 이메일을 최소로 유지하는 것이 실질적인 방어다.
- **러너가 docker 그룹으로 돈다.** 그건 사실상 root다. 러너 침해 = 이 기계 전체 침해다.
- **저장소는 공개다**(2026-09-13). 러너에서 도는 잡은 `main` push의 `deploy`뿐이다 — PR 이벤트에 self-hosted
  잡을 두지 않는다. 외부 기여자의 PR 워크플로는 Actions 설정에서 **모두 승인 필요**로 막아 둔다. 이 둘이 방어선이다.
