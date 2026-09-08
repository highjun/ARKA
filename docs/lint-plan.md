# 린트 강제 설계

ADR의 결정 중 **기계가 판정할 수 있는 것**을 도구로 옮기는 계획. 구현은 아직 하지 않았다.

원칙: **위반이 0건일 때 켜는 것이 가장 싸다.** 나중에 켜면 그동안 쌓인 것을 먼저 치워야 한다. [ADR 0005](adr/0005-client-structure.md)의 "이 0을 지키는 것이 전환 조건이다"와 같은 논리다.

실제로 오늘 그 반대 사례를 겪었다 — 구조를 재편하면서 커스텀 규칙 둘의 글롭이 따라가지 않아 **매치되는 파일이 0개가 됐고, 명백한 위반도 통과했다.** 규칙이 죽었는지는 `npx eslint --print-config <파일>`로 확인한다.

## 지금 강제되는 것 — 15개

| 수단 | 잡는 것 |
|---|---|
| `no-restricted-paths` zone 9개 | 패키지 경계 3, 클라이언트 구역 4(extensions→workbench, core→*, shared→*), extension 형제 쌍 2 |
| `arka/view-only-uses-view-model` | `view/`에서 `useViewModel` 외 훅, `useAppContext`, `*.resolve` |
| `arka/model-is-state-library-free` | `model/`에서 `nanostores`·`mobx`·`react`·`react-dom` **값** import |
| tsc | `new URI()` 차단(private constructor), query/fragment 부재 |
| `package.json` 스크립트 | VRT를 Docker에서만 실행, `check = typecheck && lint && test` |

## 1단계 — 지금 켜면 공짜 (실측 위반 전부 0건)

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
| DI 토큰은 자기 계약 파일에(`tokens.ts` 금지) | **1** | `core/commands/tokens.ts`를 `ICommandCenterRegistry.ts`로 병합. `registerServices.tsx`의 비-export 로컬 토큰 5개는 조립 디테일이라 규칙 대상 밖 |
| `it()` 이름은 한글 | **78** (20개 파일) | 기계적 번역. `core/`(26)·`shared/components/`(13)에 편중 |

## 규칙으로 만들지 않는 것

**Storybook 커버리지**(스토리 3개)와 **인터페이스마다 `.contract.ts`**(0개)는 판정은 가능하지만 **현재 전건 위반**이다. 규칙을 켜면 전면 빨간불이 되고 그건 규칙이 아니라 백로그다. [ADR 0008](adr/0008-client-testing.md) `## 상태:`에 이미 있으니 거기 둔다.

## 규칙을 쉽게 만들려고 문장을 고친 것

실제 구현에 영향이 없고, 문장을 실측에 맞추면 판정이 가능해지는 자리들.

**파일 이름** — "camelCase, React 컴포넌트만 PascalCase"는 실측 위반이 55건이었다. 그런데 규칙성이 있었다: `model/`·`viewmodel/`·`infra/`의 클래스 파일은 전부 PascalCase(36건), 계약은 전부 `I<Name>.ts`(19건, 혼재 0), 함수 모듈은 전부 camelCase. **36건을 고치는 것보다 문장을 실측에 맞추는 쪽이 맞다** — 코드는 한 글자도 안 바뀌고 위반이 0이 된다.

**`describe`/`it`** — 한 문장이 두 규칙을 뭉뚱그리고 있었다. 실측은 `it` 89% 한글, `describe` 76% 영문으로 정반대인데, `describe`의 영문은 산문이 아니라 **테스트 대상 식별자**(`describe('listDirectory')`)다. ADR 0008도 "`describe`는 대상 단위로"라고 이미 적어놨다 — 문장 둘이 서로 어긋났다. 가르면 `describe` 위반이 137→0이 되고 `it` 78건만 남는다.

**`core/view-model/`** — 유일한 kebab-case 폴더다. 형제는 `commands/`·`registry/`·`menu/`이고 슬라이스 쪽은 `viewmodel/`이다. `core/viewmodel/`로 바꾸면 폴더명 규칙에 예외가 없어진다.

## 함께 고칠 문서 오류

- **CONVENTIONS** "위 세 줄은 `no-restricted-paths`가 강제한다" — 그중 "패키지명으로 가져온다"와 "paths 별칭 금지"는 **강제되지 않는다.** 문서가 과장하고 있다
- **`tooling/eslint-rules/viewOnlyUsesViewModel.ts`** 주석이 조립 루트를 `app/`이라 부른다 — [ADR 0005](adr/0005-client-structure.md)가 **기각한 이름**이다

## 알려진 구멍

규칙을 쓸 때 함께 메울 것.

- `arka/model-is-state-library-free`의 금지 목록이 **4개 하드코딩**이다
- 두 커스텀 규칙 모두 글롭이 한쪽 확장자만 본다(`model/**/*.ts`, `view/**/*.tsx`)
- `view-only-uses-view-model`이 `CallExpression`의 **Identifier callee만** 본다 — `React.useState()`는 안 잡힌다
- extension 쌍 zone이 **수동 나열**이다. 세 번째 extension이 생기면 6쌍이 필요하고 빠뜨리면 조용히 통과한다
- 모든 zone이 `packages/*/src/**`에만 적용된다 — `tooling/`, `test/vrt/`, `e2e/`, 설정 파일은 대상 밖이다
