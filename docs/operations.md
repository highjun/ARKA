# 운영 — 이 기계에서 무엇이 어떻게 도는가

`arka.sangjun.dev`는 **사용자 PC 한 대**에서 돈다. 이 문서는 그것을 다시 세우거나 고치는 사람을
위한 것이다. 왜 이 모양인지는 [ADR 0006](adr/0006-deploy-shape.md)에 있다.

```
GitHub ──▶ self-hosted 러너 ──▶ docker compose ──▶ cloudflared 터널 ──▶ Cloudflare Access ──▶ 사람
```

## 지금 도는 것

| | |
|---|---|
| 실배포 | `arka.sangjun.dev` — compose 프로젝트 `ade`(`ade-app` + `ade-tunnel`) |
| 러너 | `~/actions-runner`, 사용자 유닛 `ade-runner.service`, 라벨 `self-hosted,linux,arka` |
| 상태 | `~/.local/state/ade/deploy/<이름>/`에 compose·cloudflared·manifest |
| 자격증명 | `~/ARKA/secure/cloudflared/<터널ID>.json`(0600), `~/ARKA/secure/env/cloudflare.env` |

**sudo가 한 번도 필요 없다.** 전부 사용자 systemd 유닛이고(`Linger=yes`), docker는 그룹 권한으로 쓴다.

## 손으로 부르는 명령

```sh
node ops/deploy/cli.ts status ade          # 무엇이 떠 있고 어디로 열려 있나
node ops/deploy/cli.ts up   <스펙> [--dry-run] [--overwrite-dns]
node ops/deploy/cli.ts down <이름> [--purge] [--remove-access] [--dry-run]
```

`pnpm run deploy`는 없다 — `deploy`가 pnpm의 내장 명령이라 이름이 겹친다.

## 배포

**`main`에 머지하면 배포된다.** 손으로 올리지 않는다 — 그러면 떠 있는 것이 어떤 커밋에도
대응하지 않는다. 지금 무엇이 떠 있는지는 화면 구석이나 아래로 확인한다.

```sh
curl -s https://arka.sangjun.dev/api/version   # Access 뒤라 로그인한 브라우저로 본다
```

### 되돌리기

배포 잡이 직전 이미지를 `ade:previous`로 표시해 둔다.

```sh
docker image tag ade:previous ade:latest
node ops/deploy/cli.ts up ops/deploy/ade.deploy.ts
```

**workbench로 돌아가려면** — `arka.sangjun.dev`는 원래 그것이 쓰던 자리다. 재료가 남아 있다.

```sh
docker compose -p workbench -f ~/.local/state/arka/deploy/workbench/docker-compose.yml up -d
cloudflared tunnel route dns --overwrite-dns a35b3f82-9881-48a1-b00e-9636c6a4801c arka.sangjun.dev
```

### `--overwrite-dns`는 언제 쓰는가

**호스트 이름을 빼앗을 때 한 번뿐이다.** 기본이 꺼져 있는 이유는, 남의 서비스를 조용히
가로채는 것이 이 도구가 할 수 있는 가장 나쁜 일이기 때문이다. 한 번 넘어온 뒤로는 필요 없다.

## 장애가 나면 — 이 순서로 짚는다

1. **러너** — `systemctl --user status ade-runner`. GitHub 쪽은 저장소 Settings → Actions → Runners.
2. **컨테이너** — `node ops/deploy/cli.ts status ade`. `⚠`가 뜨면 유령 마운트다(아래).
3. **터널** — `docker logs ade-tunnel --tail 50`. 앱이 healthy인데 밖에서 502/530이면 여기다.
4. **Access** — `node ops/deploy/anonSmoke.ts https://arka.sangjun.dev`. **302가 정상이다.**
   200이 나오면 문이 열린 것이니 즉시 내린다.

### 유령 마운트

바인드 마운트는 컨테이너를 **만든 시점의 inode**를 문다. 마운트 소스를 지웠다 새로 만들면
컨테이너만 빈 inode를 계속 본다 — 서비스는 응답하지만 다음 재시작에 죽는다.
`docker restart`로는 안 고쳐진다. **재생성만 고친다**: `cli.ts up`을 다시 돌린다.

## 러너를 다시 세우려면

```sh
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -sSL -o r.tar.gz https://github.com/actions/runner/releases/download/v<버전>/actions-runner-linux-x64-<버전>.tar.gz
tar xzf r.tar.gz && rm r.tar.gz
./config.sh --unattended --replace --url https://github.com/highjun/ARKASHIC \
  --token "$(gh api -X POST repos/highjun/ARKASHIC/actions/runners/registration-token --jq .token)" \
  --name "arka-$(hostname -s)" --labels self-hosted,linux,arka --work _work

cp ~/ARKASHIC/ops/deploy/systemd/ade-runner.service ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now ade-runner
```

**해제하려면** `systemctl --user disable --now ade-runner`, 그리고 저장소 설정에서 러너를 지운다.

## 저장소 쪽에서 필요한 것

| | |
|---|---|
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
