# 컨벤션

에이전트가 작업할 때 지켜야 할 규칙. 왜 그렇게 정했는지는 각 항목의 ADR에 있다.

## 작업 방식

- 한 번에 한 가지만 한다. 스키마·린트·테스트·문서는 각각 다른 라운드다.
- 계약(타입·인터페이스)을 먼저 제출해 승인받은 뒤 구현한다.
- 판단할 것이 3개 이상 쌓이면 라운드가 큰 것이다. 쪼개서 다시 제안한다.
- 정해진 결정을 벗어난 판단을 했으면 스스로 신고한다.

## 검토

사용자가 코드를 읽고 의도대로 되었는지 판정하는 절차다. 진행 상황은 `docs/REVIEW_CHECKLIST.md`, 거기서 나온 구조적 결정은 `docs/ADR_CANDIDATE.md`에 쌓는다. 판정은 사용자만 한다 — 에이전트는 자료를 준비할 뿐 Accept/Reject를 스스로 정하지 않는다.

### 계약 우선 리뷰

```
1. 인터페이스·타입만 제출
2. 검토 (10~30줄)
3. 승인 후 구현
4. 구현은 훑기만
```

계약이 승인되면 구현은 타입 체커와 계약 테스트가 검증한다. **500줄을 읽을 필요가 없다.** 이걸 가능하게 하는 것이 `model/` 계층 분리다 — `model/`과 `viewmodel/I*.ts`에 순수 타입과 인터페이스만 있으면 그 diff만 보고 설계 변경을 전부 파악할 수 있다.

### 검토 강도

| 정독 (전체의 10~15%) | 훑기 | 도구 위임 |
|---|---|---|
| 폴더 단위(분해가 맞는가) | `model/` 구현 | 구조 → 린트 |
| `contracts/` | `infra/` | 계약 → 테스트 |
| `model/`·`viewmodel/`의 `I*.ts` | `viewmodel/` 구현 | UI → Storybook |
| `index.ts` | 테스트 | |
| 린트·tsconfig 설정 | | |

**"이 셋으로 나눈 게 맞는가"는 사람만 판정할 수 있다.** `arka/file-names`는 형식만, `arka/slices-are-siblings`는 방향만 본다. 그래서 폴더 단위가 정독이다.

### 검토 필수 지점

- **이벤트 로그 스키마(`contracts/agent/events.ts`) — 가장 중요.** 진화 규칙이 걸려 있다 → [ADR 0019](docs/adr/0019-agent-domain.md)
- `contracts/` 전체
- 공개 API 표면(`index.ts`)
- 린트·tsconfig 설정

나머지는 계약 테스트와 린트에 위임한다.

### 브랜치

- **한 번에 한 슬라이스. 브랜치 = 슬라이스** — 여러 슬라이스를 한 브랜치에서 건드리면 검토가 뒤섞인다.
- **`core/`·`contracts/` 변경은 별도 브랜치로 먼저 머지한다.** 파급이 어디까지 갈지 정적으로 알 수 없다.
- 브랜치 수명은 짧게. 에이전트는 빠르게 많이 만들어내므로 오래 두면 충돌 규모가 감당 불가가 된다.

### 원칙

> **검토 부담이 커지면 그건 구조 문제다.** 공개 표면이 넓어졌거나, 슬라이스 경계가 흐려졌거나, 계약 없이 구현부터 갔거나. 더 열심히 보는 게 아니라 구조를 조이거나 린트 규칙을 추가한다.

1. **강제 장치가 대상보다 먼저** — 린트 → 슬라이스, 토큰 → 컴포넌트, stylelint → CSS
2. **추상화는 사례 2~3개 뒤에** — 이벤트 버스, 기여 지점, 서버 DI
3. **되돌리기 비싼 것을 먼저** — contracts, 이벤트 스키마, 의존 방향, 인증 자리

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
- 공유가 필요하면 `contracts`에 두고 패키지명으로 가져온다 — `import { URI } from "contracts"`. tsconfig `paths` 별칭은 쓰지 않는다(tsc만 알아서 vitest·node에서 깨진다).
- 위 **두 줄**(`contracts`·`client`↔`server`)은 `eslint.config.ts`의 `import-x/no-restricted-paths`가 강제한다. 위반하면 어디로 옮기라는 안내가 함께 나온다. **셋째 줄(패키지명 import·`paths` 금지)은 아직 강제되지 않는다** — 리뷰로 본다. → [린트 설계](docs/lint-plan.md)

## 코드 구조

- 코드는 도메인별 슬라이스 아래에 모은다. 레이어를 최상위로 두지 않는다. → client [ADR 0005](docs/adr/0005-client-structure.md), server [ADR 0007](docs/adr/0007-server-structure.md)
- 도메인을 모르는 것(DI·설정·부팅)만 `core/`에 둔다.
- 슬라이스 내부 — client는 `model/` `infra/` `viewmodel/` `view/` `component/`, server는 `domain/` `infra/` `services/` `transport/`.
- 의존은 안쪽(`model`/`domain`)을 향한다. 어느 구현이 꽂힐지는 조립부(client는 `workbench/registerServices.tsx`)가 정한다.
- `index.ts`에는 바깥이 실제로 부르는 것만 넣는다. 내부 구현·에러 타입·유틸은 내보내지 않는다.
- 슬라이스끼리 직접 import하지 않는다. DI 토큰이나 이벤트로만 소통한다.
- `shared/`는 아무것도 import할 수 없다. 공통 추출은 아래로만 한다.
- client는 `core/ workbench/ extensions/ shared/` 넷이다. 의존 방향은 `eslint.config.ts`의 zone이 강제한다.
- **빈 레이어를 미리 만들지 않는다.** 실제 I/O나 유스케이스가 생길 때 폴더를 만든다.
- 파일 이름: 클래스·React 컴포넌트·계약(`I<Name>.ts`)은 PascalCase, 함수 모듈은 camelCase. 폴더는 camelCase(컴포넌트 폴더는 그 컴포넌트 이름). 하이픈·밑줄은 쓰지 않는다 — `arka/file-names`가 강제한다.
- **`model/`은 사실과 사건을, `viewmodel/`은 화면 상태를 다룬다.** `model`→`viewmodel`은 이벤트로, `viewmodel`→`view`는 바인딩으로 잇는다. atom은 ViewModel이 소유한다. → [ADR 0005](docs/adr/0005-client-structure.md)
- **`model/`은 도메인 타입·규칙(순수 로직)과 `infra/`가 구현할 인터페이스 선언까지다.** React·fetch·window·전역 상태를 런타임으로 알지 않는다.
- **`view/`가 부르는 훅은 `useViewModel` 하나뿐이다.** 로컬 상태가 필요하면 ViewModel로 옮긴다. DI 접근(`useAppContext`·`resolve`)도 하지 않는다.
- 위 두 줄은 `tooling/eslint-rules/`와 `eslint.config.ts`가 강제한다 — `model/`의 상태 라이브러리·React import, `model/`·`viewmodel/`의 `fetch`·`window`·`document` 전역, `view/`의 `useViewModel` 외 훅(`React.useState()` 형태 포함)을 잡는다. 슬라이스끼리의 import는 `arka/slices-are-siblings`가 잡는다. 규칙마다 `tooling/eslint-rules/*.test.ts`에 valid/invalid fixture가 있다.
- CSS는 `stylelint`(`pnpm run lint:css`)가 본다 — 색은 Primer 토큰만, hex·색 이름·`rgb()` 직접 지정 금지. → [ADR 0006](docs/adr/0006-design-system.md)

## 테스트

기준은 하나다 — **이 코드가 잘못 동작하면 누가 알려주는가.** 타입 체커·린트·계약 테스트가 알려주면 안 쓰고, 아무도 안 알려주면 쓴다. "눈으로 보면 안다"는 답이 아니다. → [ADR 0008](docs/adr/0008-client-testing.md)

- **계약** — 인터페이스마다 모든 구현이 통과할 스위트. `<name>.contract.ts`, 함수 export. **mock도 통과시킨다.**
- **단위** — 계약이 못 잡는 것만. 대상 옆 `*.test.ts`. 적을수록 좋은 신호다.
- **스모크** — view가 렌더되고 이벤트가 연결되는지만. 스타일은 Storybook 담당.
- **Storybook** — 시각 검증. 최소 세트는 기본 / 빈 / 로딩 / 에러.
- **E2E** — `e2e/*.spec.ts`.
- **VRT** — 스토리를 순회해 찍는다. `pnpm run vrt`(비교) / `vrt:update`(기준 갱신). **Docker에서만** 생성·비교한다.
- 단위·계약·스모크·스토리는 코드 옆에, E2E는 `e2e/`, VRT는 `test/vrt/`에. 클라이언트 어댑터를 서버 앱에 직결하는 계약 실행은 `test/contract/`(`pnpm run test:contract`). 던더 폴더와 그 밖의 `tests/` 폴더는 쓰지 않는다.
- Mock은 `Mock<Name>.ts`, fixture는 `fixtures.ts`로 테스트와 스토리가 공유한다.
- `toMatchSnapshot`은 쓰지 않는다 — 무비판적으로 갱신하게 된다.
- 커버리지 목표를 두지 않는다.
- `describe`/`it` 이름은 한글로 쓴다. TSDoc의 `@throws`에 적은 경우는 각각 테스트로 확인한다 — 적어두기만 하면 주장일 뿐이다.
- 설정 파일은 갈라질 때만 만든다. 기본값으로 도는 동안에는 두지 않는다.

E2E는 `pnpm --filter client test:e2e`로 돌린다. 조립이 맞물리는지는 `workbench/registerServices.test.tsx`가 본다 — 대상(`registerServices.tsx`) 옆에 있는 단위 테스트다.

## URI
- 파일·리소스는 문자열 경로 대신 `URI`로 가리킨다. → [ADR 0003](docs/adr/0003-uri.md)
- `URI.parse()` 또는 `URI.file()`로만 만든다.
- `Map`/`Set` 키로 쓸 때는 `uri.toString()`을 쓴다.

## 제출 전 확인

- [ ] `pnpm run check` 통과 (typecheck → lint → test)
- [ ] 이번 라운드가 한 가지 관심사인가
- [ ] 스스로 판단한 지점을 신고했는가