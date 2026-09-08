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

## 테스트

- 테스트는 대상 코드 옆에 둔다. `uri.ts` → 같은 폴더의 `uri.test.ts`. 별도 `test/` 트리를 만들지 않는다.
- `vitest`를 쓴다. 패키지마다 `"test": "vitest run"` 스크립트를 두고, 루트에서 `pnpm run test`로 전부 돌린다.
- 설정 파일은 갈라질 때만 만든다. 기본값으로 도는 동안에는 두지 않는다.
- `describe`/`it` 이름은 한글로 쓴다.
- TSDoc의 `@throws`에 적은 경우는 각각 테스트로 확인한다. 적어두기만 하면 주장일 뿐이다.

## 패키지
- 패키지는 `contracts`·`client`·`server` 3개뿐이다. → [ADR 0001](docs/adr/0001-monorepo-pnpm.md)
- `contracts`는 `client`·`server`를 import하지 않는다.
- `client`와 `server`는 서로 import하지 않는다.
- 공유가 필요하면 `contracts`에 두고 패키지명으로 가져온다 — `import { URI } from "contracts"`. tsconfig `paths` 별칭은 쓰지 않는다(tsc만 알아서 vitest·node에서 깨진다).
- 위 세 줄은 `eslint.config.ts`의 `import-x/no-restricted-paths`가 강제한다. 위반하면 어디로 옮기라는 안내가 함께 나온다.

## 코드 구조

- 코드는 도메인별 `features/<name>/` 아래에 모은다. 레이어를 최상위로 두지 않는다. → [ADR 0005](docs/adr/0005-code-structure.md)
- 도메인을 모르는 것(DI·설정·부팅)만 `core/`에 둔다.
- feature 내부 — client는 `model/` `infra/` `viewmodel/` `view/`, server는 `domain/` `infra/` `services/` `transport/`.
- 의존은 안쪽(`model`/`domain`)을 향한다. 어느 구현이 꽂힐지는 `app`/`bootstrap`이 정한다.
- `index.ts`에는 바깥이 실제로 부르는 것만 넣는다. 내부 구현·에러 타입·유틸은 내보내지 않는다.
- features끼리 직접 import하지 않는다. DI나 이벤트로만 소통한다.
- `shared/`는 `features/`를 import할 수 없다. 공통 추출은 아래로만 한다.
- **빈 레이어를 미리 만들지 않는다.** 실제 I/O나 유스케이스가 생길 때 폴더를 만든다.
- 파일 이름은 camelCase, React 컴포넌트만 PascalCase.

## URI
- 파일·리소스는 문자열 경로 대신 `URI`로 가리킨다. → [ADR 0003](docs/adr/0003-uri.md)
- `URI.parse()` 또는 `URI.file()`로만 만든다.
- `Map`/`Set` 키로 쓸 때는 `uri.toString()`을 쓴다.

## 제출 전 확인

- [ ] `pnpm run check` 통과 (typecheck → lint → test)
- [ ] 이번 라운드가 한 가지 관심사인가
- [ ] 스스로 판단한 지점을 신고했는가