# 컨벤션

에이전트가 작업할 때 지켜야 할 규칙. 왜 그렇게 정했는지는 각 항목의 ADR에 있다.

## 작업 방식

- 한 번에 한 가지만 한다. 스키마·린트·테스트·문서는 각각 다른 라운드다.
- 계약(타입·인터페이스)을 먼저 제출해 승인받은 뒤 구현한다.
- 판단할 것이 3개 이상 쌓이면 라운드가 큰 것이다. 쪼개서 다시 제안한다.
- 정해진 결정을 벗어난 판단을 했으면 스스로 신고한다.

## 주석·문서

- 한글로 쓴다. 코드 식별자와 런타임 문자열(`throw new Error(...)` 등)만 영문. → [ADR 0002](docs/adr/0002-korean-docs.md)
- 주석은 네 가지만 쓴다 — 계약 / 왜 / 비자명한 로직 / 외부 사정. → [ADR 0004](docs/adr/0004-comment-rules.md)
    - 계약은 TSDoc으로, 나머지 셋은 인라인으로 쓴다.
    - "무엇을 하는지"와 타입이 이미 말하는 것은 쓰지 않는다.
    - 배경 설명이 길어지면 ADR로 옮기고 링크만 남긴다.

## 패키지
- 패키지는 `contracts`·`client`·`server` 3개뿐이다. → [ADR 0001](docs/adr/0001-monorepo-pnpm.md)
- `contracts`는 `client`·`server`를 import하지 않는다.
- `client`와 `server`는 서로 import하지 않는다.
- 공유가 필요하면 `contracts`에 두고 `@contracts/*`로 가져온다.

## URI
- 파일·리소스는 문자열 경로 대신 `URI`로 가리킨다. → [ADR 0003](docs/adr/0003-uri.md)
- `URI.parse()` 또는 `URI.file()`로만 만든다.
- `Map`/`Set` 키로 쓸 때는 `uri.toString()`을 쓴다.

## 제출 전 확인

- [ ] `pnpm run typecheck` 통과
- [ ] 이번 라운드가 한 가지 관심사인가
- [ ] 스스로 판단한 지점을 신고했는가