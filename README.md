# ARKA

에이전트가 사용자의 워크스페이스를 다루는 개발 환경. 브라우저에서 열고 폰에 설치한다.
파일 트리·에디터·검색·소스 제어·에이전트 대화가 한 화면에 있다.

**개인 프로젝트다.** 사용자 PC 한 대에서 돌고, 사용자는 한 명이다.

## 무엇으로 만들었나

| | |
| --- | --- |
| 패키지 | `contracts`(zod 스키마) · `client`(React PWA) · `server`(Hono) — pnpm 워크스페이스 |
| 배포 단위 | Docker 이미지 하나. 클라이언트 정적 파일과 서버 번들이 함께 들어간다 |
| 저장소 | SQLite(`node:sqlite`) |
| 바깥 | cloudflared Tunnel + Cloudflare Access. **앱은 인증을 모른다** |

## 손에 익힐 명령

```sh
pnpm install
pnpm --filter server run dev        # 서버
pnpm --filter client run dev        # 클라이언트
pnpm --filter client run dev:storybook   # 컴포넌트만 따로

pnpm --filter ops check                   # CI의 `check` 잡이 부르는 것과 같은 명령
```

## 읽을 것

| | |
| --- | --- |
| [docs/concept.md](docs/concept.md) | 무엇을 왜 만드나 |
| [docs/operations.md](docs/operations.md) | 이 기계에서 무엇이 어떻게 도나, 장애가 나면 |
| [docs/adr/](docs/adr/) | 왜 이 모양인가 |
| [스토리북](https://highjun.github.io/ARKASHIC/) | 컴포넌트를 눈으로 — PR마다 `pr-<번호>/`에도 올라간다 |
| [SECURITY.md](SECURITY.md) | **인증이 없다는 전제.** 직접 세우기 전에 읽는다 |

## 라이선스

MIT. [LICENSE](LICENSE).
