# 린트 강제 설계

ADR의 결정 중 **기계가 판정할 수 있는 것**을 도구로 옮기는 계획. 구현은 아직 하지 않았다.

원칙: **위반이 0건일 때 켜는 것이 가장 싸다.** 나중에 켜면 그동안 쌓인 것을 먼저 치워야 한다. [ADR 0005](adr/0005-client-structure.md)의 "이 0을 지키는 것이 전환 조건이다"와 같은 논리다.

실제로 오늘 그 반대 사례를 겪었다 — 구조를 재편하면서 커스텀 규칙 둘의 글롭이 따라가지 않아 **매치되는 파일이 0개가 됐고, 명백한 위반도 통과했다.** 규칙이 죽었는지는 `npx eslint --print-config <파일>`로 확인한다.

## 지금 강제되는 것 — 27개

| 수단 | 잡는 것 |
|---|---|
| `no-restricted-paths` zone 9개 | 패키지 경계 3, 클라이언트 구역 4(extensions→workbench, core→*, shared→*), extension 형제 쌍 2 |
| `arka/view-only-uses-view-model` | `view/`에서 `useViewModel` 외 훅, `useAppContext`, `*.resolve` |
| `arka/model-is-state-library-free` | `model/`에서 `nanostores`·`mobx`·`react`·`react-dom` **값** import |
| tsc | `new URI()` 차단(private constructor), query/fragment 부재 |
| `package.json` 스크립트 | VRT를 Docker에서만 실행, `check`, **`lint:config`(tsconfig `paths` 금지)** |
| `no-restricted-globals` | `model/`의 `fetch`·`window`·`document`·`localStorage`, `viewmodel/`의 `document`·`window` |
| `no-restricted-imports` | `component/`의 ViewModel·Model·DI, `infra/`의 React |
| `no-restricted-syntax` | `toMatchSnapshot`, Primer 배럴 re-export, 던더 폴더 |
| zone (추가분) | workbench 계층→extensions, 서버 domain←infra←transport, 서버 feature 쌍 |

## 1단계 — 구현 완료 (2026-09-08)

**12개 전부 켰고 위반 0건이다.** 각 규칙을 일부러 깨서 잡히는 것을 확인했다 — 통과만 보면 규칙이 죽어 있어도 초록이기 때문이다.

| # | 규칙 | 출처 | 수단 |
|---|---|---|---|
| 1 | `toMatchSnapshot`·`toMatchInlineSnapshot` 금지 | 0008 | `no-restricted-syntax` |
| 2 | `infra/`는 React 금지 | 0005 | `no-restricted-imports` |
| 3 | `component/`는 ViewModel·Model·DI 금지 | 0005 | zone + 커스텀(`useViewModel` 호출) |
| 4 | `viewmodel/`은 `document.*`·`window.*` 금지 | 0005 | `no-restricted-globals` |
| 5 | `model/`의 `fetch`·`window` 금지 | 0005 — **현 규칙이 비워둔 절반** | `no-restricted-globals`. `this.#fetch`는 오탐이라 전역만 잡아야 한다 |
| 6 | `model/` 금지 목록에 `jotai`·`zustand`·`redux`·`valtio` 추가 | 0005 | 기존 규칙의 배열 |
| 7 | Primer를 `shared/components` 배럴로 re-export 금지 | 0006 — 지금은 **주석으로만** 있다 | `no-restricted-syntax`(ExportNamedDeclaration source) |
| 8 | `workbench/{model,viewmodel,view}` → `extensions` 금지 | 0005 "조립부에서만" | zone 3개 |
| 9 | 서버 레이어 방향 `transport → services → domain ← infra` | 0007 — **서버에 zone이 0개** | zone |
| 10 | 서버 features 간 직접 import 금지 | 0007 | zone(쌍별) |
| 11 | 던더 폴더 금지, 별도 `tests/` 금지(`test/vrt/` 예외) | 0008 | 파일명 규칙 |
| 12 | tsconfig `paths` 금지 | 0001 | `check` 스크립트의 grep |

## 2단계 — 작업이 따르는 것

| 규칙 | 위반 | 할 일 |
|---|---|---|
| ~~DI 토큰은 자기 계약 파일에(`tokens.ts` 금지)~~ | 0 | 2026-09-09 병합 완료, `**/tokens.ts` 금지 규칙 켬 |
| `it()` 이름은 한글 | **78** (20개 파일) | 기계적 번역. `core/`(26)·`shared/components/`(13)에 편중 |

## 규칙으로 만들지 않는 것

~~**Storybook 커버리지**(스토리 3개)와 **인터페이스마다 `.contract.ts`**(0개)는 판정은 가능하지만 **현재 전건 위반**이다.~~ 2026-09-09 재측정 — 둘의 운명이 갈렸다.

**Storybook 커버리지 → 규칙으로 켰다**(`arka/components-have-stories`). 실측 위반 **0건**이다(스토리 3개 → 150개+). `shared/components/**`와 슬라이스 `component/**`의 **주인 파일**(`FileTree/FileTree.tsx`)만 본다 — 폴더의 곁다리(`shared.ts`, 훅)와 `view/`는 대상이 아니다. `view/`를 뺀 것은 "조합이 드러나는 것만" 고르기로 했기 때문이고 그 목록은 `.storybook/main.ts`에 있다. 규칙이 사는지는 `Icon.stories.tsx`를 잠깐 치워 확인했다.

**인터페이스마다 `.contract.ts` → 규칙으로 만들지 않는다.** 이유가 "아직 위반이 많아서"가 아니라 **파일 이름으로 판정할 수 없어서**로 바뀌었다.

- 단순 비율은 인터페이스 40 : 계약 10이지만, 그 40에는 계약이 필요 없는 것이 대부분이다 — `I*ViewModel`과 레지스트리는 구현이 하나뿐이라 "모든 구현이 통과할 스위트"라는 말 자체가 성립하지 않는다.
- 의미 있는 좁힌 형태는 "`Mock<Name>.ts`가 있으면 계약도 있다"인데, 이름으로 맞춰 보면 `MockAgentBackend`가 위반으로 잡힌다. **실제로는 위반이 아니다** — 그 Mock은 `IAgentApi`와 `IAgentEvents` **둘을** 구현하고 `agentApi.contract.ts`가 이미 덮는다. Mock 하나가 인터페이스 여럿을 구현할 수 있어 이름이 1:1로 대응하지 않는다.
- 서버는 이름 관행 자체가 다르다 — 인메모리 구현이 `MemoryEventStore`·`MemorySessionStore`이고 `Mock*`이 하나도 없다. 이름을 맞출지는 별도 결정이라 `ADR_CANDIDATE`로 보낸다.
- 실제 커버리지는 **Mock 8개가 전부 계약에 덮여 있다**. 규칙 없이도 지켜지고 있는 셈이라, 지금 판정 불가능한 규칙을 억지로 만들 이유가 없다.

## 규칙을 쉽게 만들려고 문장을 고친 것

실제 구현에 영향이 없고, 문장을 실측에 맞추면 판정이 가능해지는 자리들.

**파일 이름** — "camelCase, React 컴포넌트만 PascalCase"는 실측 위반이 55건이었다. 그런데 규칙성이 있었다: `model/`·`viewmodel/`·`infra/`의 클래스 파일은 전부 PascalCase(36건), 계약은 전부 `I<Name>.ts`(19건, 혼재 0), 함수 모듈은 전부 camelCase. **36건을 고치는 것보다 문장을 실측에 맞추는 쪽이 맞다** — 코드는 한 글자도 안 바뀌고 위반이 0이 된다.

**`describe`/`it`** — 한 문장이 두 규칙을 뭉뚱그리고 있었다. 실측은 `it` 89% 한글, `describe` 76% 영문으로 정반대인데, `describe`의 영문은 산문이 아니라 **테스트 대상 식별자**(`describe('listDirectory')`)다. ADR 0008도 "`describe`는 대상 단위로"라고 이미 적어놨다 — 문장 둘이 서로 어긋났다. 가르면 `describe` 위반이 137→0이 되고 `it` 78건만 남는다.

**`core/viewmodel/`** — 유일한 kebab-case 폴더다. 형제는 `commands/`·`registry/`·`menu/`이고 슬라이스 쪽은 `viewmodel/`이다. `core/viewmodel/`로 바꾸면 폴더명 규칙에 예외가 없어진다.

## 함께 고칠 문서 오류

- **CONVENTIONS** "위 세 줄은 `no-restricted-paths`가 강제한다" — 그중 "패키지명으로 가져온다"와 "paths 별칭 금지"는 **강제되지 않는다.** 문서가 과장하고 있다
- **`tooling/eslint-rules/viewOnlyUsesViewModel.ts`** 주석이 조립 루트를 `app/`이라 부른다 — [ADR 0005](adr/0005-client-structure.md)가 **기각한 이름**이다

## 메운 구멍 (2026-09-09)

- ~~`view-only-uses-view-model`이 Identifier callee만 본다~~ → `React.useState()` 같은 멤버 호출도 잡는다
- ~~extension 쌍 zone이 수동 나열~~ → `arka/slices-are-siblings`가 경로에서 슬라이스 이름을 뽑아 비교한다. 클라이언트 `extensions/*`와 서버 `features/*`에 같은 규칙. 슬라이스를 추가해도 설정을 안 건드린다
- ~~zone이 `packages/*/src/**`만 본다~~ → `e2e/`, `.storybook/`, `*.config.ts`, `test/`, `tooling/`까지 대상. E2E·VRT가 소스를 import하면 잡는 zone을 추가했다
- ~~커스텀 규칙 fixture 테스트 없음~~ → `tooling/eslint-rules/*.test.ts`(RuleTester, `pnpm run test:tooling`)
- ~~stylelint 없음~~ → `packages/client/stylelint.config.js`, `pnpm run lint:css`. 색 직접 지정(hex·이름·rgb/hsl 함수) 금지, 나머지는 `stylelint-config-standard`

남은 것:
- `arka/model-is-state-library-free`의 금지 목록이 하드코딩이다(12개)
