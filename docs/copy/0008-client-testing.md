# ADR 0008: 클라이언트 테스트

## 결정

### 무엇을 테스트하나

> **이 코드가 잘못 동작하면 누가/무엇이 알려주는가?**

- 타입 체커·린트가 알려준다 → 불필요
- 계약 테스트가 알려준다 → 이미 커버됨
- Storybook 빌드가 알려준다 → 부분 커버. 렌더 실패만 잡는다
- **아무도 안 알려준다 → 테스트 필요**

**"눈으로 보면 안다"는 답이 아니다.** 변경한 사람이 그 화면을 보고 있다는 보장이 없다. 커버리지 숫자가 아니라 이 질문으로 개별 판단한다.

### 종류와 비중

```
component/   Storybook — 시각 검증
view/        스모크    — 렌더, 이벤트 연결
viewmodel/   중간      — 상태 전이, 커맨드
model/       집중      — 도메인 규칙 (순수해서 테스트가 쉽고 값이 크다)
infra/       계약      — 인터페이스 준수
```

- **계약 테스트가 중심이다.** `model/`이 선언한 인터페이스마다, 그것을 구현한 **모든 것**이 통과할 스위트를 함수로 쓴다. TSDoc이 약속한 것(던지는 에러, 부수효과, 제약)을 강제한다. **mock도 반드시 통과시킨다** — 그래야 Storybook과 단위 테스트를 신뢰할 수 있다. 값은 둘이다: mock이 실물처럼 군다는 보장, 그리고 계약 위반이 즉시 잡히므로 **구현 코드 리뷰를 줄일 수 있다**는 것.
- **단위 테스트는 계약이 못 잡는 것만.** 인터페이스 없는 순수 함수(경로 정규화, etag 비교, 정렬), ViewModel 상태 전이, infra의 에러 변환(HTTP 404 → NotFound는 구현마다 달라 계약이 아니다). **적을수록 좋은 신호다** — 인터페이스로 잘 나뉘어 있다는 뜻이다. "이걸 테스트해야 하나?"가 자주 나오면 **그 코드가 잘못된 계층에 있는지 먼저 의심한다.**
- **스모크는 view가 렌더되고 이벤트가 연결되는지만.** 스타일·레이아웃은 Storybook 담당이다.
- **Storybook은 시각 검증이다.** 커버 범위는 `shared/components/` 전부, `*/component/` 전부, 컨테이너 view는 주요 상태만. **최소 세트는 기본 / 빈 / 로딩 / 에러** — 빈 상태와 에러가 가장 빠뜨리기 쉽다. mock VM은 인터페이스만 구현하면 되고 고정값 객체면 충분하다. **스토리 작성이 어려우면 구조를 의심한다.**
- **E2E는 `e2e/`에.** 최소 흐름부터 늘린다.
- **VRT는 스토리를 순회한다.** 스토리북을 정적 빌드해 `index.json`의 스토리마다 `iframe.html`을 찍는다 — 스토리를 추가하면 VRT가 저절로 따라오고, 컴포넌트마다 스펙을 새로 쓰지 않는다. 설정과 기준 이미지는 저장소 전역의 `test/vrt/`에 둔다(특정 패키지의 산출물이 아니라 저장소가 합의한 기준이라서다). **Docker에서만 생성·비교한다** — 호스트마다 폰트 렌더링·서브픽셀이 달라, 고정하지 않으면 기준이 아니라 소음이 된다.
- **테스트하지 않는 것**: getter/setter만 있는 것, 라이브러리 동작(Radix가 팝오버를 여는지), 구현 세부(내부 메서드 호출 횟수).

### 배치와 작성

단위·계약·스모크·스토리는 코드 옆에, E2E는 `e2e/`, VRT는 `test/vrt/`에 모은다. **패키지 둘 이상을 한 프로세스에 올리는 계약 실행**(클라이언트 어댑터 ↔ 서버 앱)은 어느 패키지에도 둘 수 없으므로 `test/contract/`에 둔다 — 스위트 자신은 계약을 소유한 `model/`에 있고, 여기는 실행만 한다.

```
extensions/filesystem/
  model/       directoryTree.ts / .test.ts
               workspaceFiles.contract.ts    계약 스위트
  infra/       HttpWorkspaceFiles.ts / .test.ts
  viewmodel/   DirectoryTreeViewModel.ts / .test.ts
  view/        DirectoryTreeView.tsx / .test.tsx
  component/   FileTree.tsx / .test.tsx / .stories.tsx
               MockDirectoryTreeViewModel.ts

e2e/           *.spec.ts                     E2E
test/vrt/      vrt.config.ts, stories.spec.ts, snapshots/
```

- 계약 스위트는 `<name>.contract.ts` — 함수를 export할 뿐 스스로 실행되지 않아 `.test.ts`가 아니다
- Mock은 `Mock<Name>.ts`
- 테스트 이름은 **동작을 한국어로 서술**한다 — `'없는 파일을 읽으면 NotFound를 던진다'`. `describe`는 대상 단위로 — `describe('URI')`
- 도구는 Vitest + `@testing-library/react`, E2E·VRT는 Playwright
- 루트 `check = typecheck && lint && test` — 제출 전 이것 하나만 돌리면 되게 한다

## 기각:
- **테스트 층 이름을 표준(Unit/Integration/E2E)으로 갈아끼우기** — 「클라이언트 테스트 전략」이 이미 "계약 테스트"·"스모크"를 정의했다. 바깥 자료와 단어가 겹치는 비용보다 확정된 어휘를 흔드는 비용이 크다.
- **커버리지 목표와 층별 비율 목표** — "누가 알려주는가"로 개별 판단한다.
- **Jest식 스냅샷(`toMatchSnapshot`)** — 무비판적으로 갱신하게 된다. VRT는 다르다. 이미지 차이는 눈으로 봐야 승인된다.
- **VRT 스냅샷을 호스트에서 생성하기** — 폰트 렌더링·서브픽셀이 기계마다 달라 기준이 소음이 된다.
- **던더 폴더(`__tests__`, `__mocks__`)** — 같은 것을 폴더명과 파일명 두 군데로 표시하게 되고, 슬라이스 안에서 폴더가 한 겹 더 늘어난다.
- **별도 `tests/` 폴더** — 슬라이스 원칙을 깨뜨린다. `test/vrt/`는 예외다: 기준 이미지는 코드가 아니라 저장소 전체가 합의한 기준이고, 옆에 둘 대상 코드가 없다.
- **VRT 스냅샷을 `__snapshots__`에 두기** — 그건 Jest/Vitest의 `toMatchSnapshot` 관례인데 그 방식을 위에서 기각했고, 던더 폴더도 기각했다. Playwright 관례는 `<spec>-snapshots/`라 어느 쪽도 아니다.

## 상태:
승인됨. 계층 이름은 [ADR 0005](0005-client-structure.md)를 따른다. 「클라이언트 테스트 전략」 문서를 이 저장소의 이름으로 옮긴 것이다.

현재 코드와 다른 것:

1. **스토리가 프리미티브 셋(Icon·Divider·Timestamp)뿐이다.** 스토리북과 VRT 파이프라인은 돌지만 커버 범위(`shared/components/` 전부, `*/component/` 전부)는 아직 비어 있다.
2. ~~계약 테스트가 하나도 없다.~~ 2026-09-09 — `IWorkspaceFiles`에 첫 스위트(`workspaceFiles.contract.ts`)가 생겼다. `MockWorkspaceFiles`와, 서버 앱에 `fetch`를 직결한 `HttpWorkspaceFiles`(`test/contract/`) 둘 다 통과한다. 첫 실행에서 서버의 move가 목적지를 덮어쓰는 계약 위반을 잡았다. 다른 인터페이스(`IWorkspaceWatch`·`IStorage`·`IDirectoryTreeModel` 등)는 아직 없다.
3. VRT가 아직 CI에 없다. 사람이 `pnpm run vrt`를 기억해서 돌려야 한다.

2026-09-09 개정 — **`fixtures.ts`("테스트와 스토리가 공유") 규약을 철회한다.** 48커밋 동안 채택률이 0이었고, 실측해 보니 그럴 이유가 있었다. `FileTree`가 대표적이다 — 스토리는 그럴듯한 프로젝트 트리 하나(`src/components/Button.tsx` …)를 쓰고, 테스트는 단언마다 다른 최소 트리 셋(`ITEMS`·`NESTED_ITEMS`·`TWO_ITEMS`)을 쓴다. 같은 데이터가 아니고 같아서도 안 된다. 스토리는 사람이 보는 그림이라 그럴듯해야 하고, 테스트는 실패했을 때 원인이 좁아야 한다. 공유를 강제하면 스토리는 앙상해지고 테스트는 무뎌진다. `Mock<Name>.ts` 명명은 실제로 쓰이고 있으므로(10개) 그대로 둔다.
