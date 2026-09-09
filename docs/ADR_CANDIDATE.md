# ADR 후보

검토 중 나온 **구조적 결정**(전역적으로 다른 부분에도 영향을 미치는 결정)을 여기 쌓는다. 유닛 하나에서만 끝나는 지적은 여기가 아니라 backlog 태스크로 간다.

검토가 끝나면 각 항목은 두 가지로 변환된다.

1. `docs/adr/NNNN-*.md` — 결정과 기각 이유
2. 가능하면 **린트 규칙** — `tooling/eslint-rules/`에 `message`로 대안을 적고 `*.test.ts`에 valid/invalid fixture를 둔다

규칙으로 만들 수 없는 것(예: "이 셋으로 나눈 게 맞는가")은 ADR만 남긴다. **전건 위반인 규칙은 규칙이 아니라 백로그다** — 위반을 먼저 0으로 만들고 켠다([lint-plan](lint-plan.md)).

## 형식

```markdown
### 제목
- **무엇이 걸렸나**: 어느 유닛에서 어떻게 드러났는가
- **결정할 것**: 한 문장
- **선택지**: A / B / C와 각각의 대가
- **린트로 갈 수 있는가**: 예(어떤 규칙) / 아니오(왜)
- **상태**: 열림 / 결정됨 → ADR NNNN
```

---

## 수렴한 것 — ADR 승격 대기

2026-09-09 검토에서 논의가 끝난 것들. 셋이 서로를 지탱해서 따로 못 올린다 — A가 서려면 B가 필요하고, B가 서면 A의 스토리가 얇아지며, C가 A의 부산물을 담는다.

### A. `view/`도 Storybook 대상이다 — 배치를 보는 자리

- **무엇이 걸렸나**: 시각 검토를 Storybook으로 하기로 했는데 `view/` 스토리가 0개였다. `.storybook/main.ts` 주석은 "컨테이너 상태만 골라 쓴다"고 적었지만 실제 커버리지는 0이라 문서가 하지 않는 일을 하는 것처럼 적혀 있었다.
- **결정할 것**: view를 Storybook에 올릴 것인가, 올린다면 ViewModel을 무엇으로 채울 것인가.
- **바깥 관례**: Storybook 공식 문서는 **"연결 로직은 Storybook 밖 래퍼 하나에 몰고 화면 수준까지 순수 프레젠테이션으로"** 를 권한다(BBC·The Guardian·메인테이너 팀). 컨테이너를 그리려면 context를 흉내내야 한다는 것이 *단점으로* 기술돼 있다. 다만 그 경우를 위한 **"Mocking providers"** 를 공식 패턴으로 함께 문서화한다.
- **결정**: **올린다.** 관례가 최적화하는 목표는 "흉내 비용을 줄이는 것"이고 여기서의 목표는 **"앱을 켜기 전에 배치를 확인하는 것"** 이다. 목표가 다르므로 답도 다르고, Storybook이 그 길을 공식으로 열어 두었다.
- **ViewModel은 스텁 객체로 주입한다.** 실물 VM + Mock 포트(기존 view 테스트 4개의 방식)와 견주었다.

  | | 실물 VM + Mock 포트 | 스텁 VM 객체 |
  |---|---|---|
  | 검증 범위 | 바인딩·VM 로직까지 실제로 돎 | "이 상태면 이 배치"만 |
  | 상태 도달 | 에러·재연결 등 일부는 못 만듦 | 계약의 **모든** 상태를 세울 수 있음 |
  | VRT | 비동기라 찍는 순간이 흔들림 | 결정적 |

  스토리의 목적을 "배치 확인"으로 못박으면 VM이 그 상태를 *어떻게* 만들었는지는 볼 대상이 아니다 — 그건 ViewModel 자신의 단위 테스트 몫이다. 검토용으로는 **계약의 모든 상태를 세울 수 있다는 점**이 결정적이다. 스텁의 *모양*은 타입 체커가 붙든다(`satisfies I<Name>ViewModel`); 붙들지 않는 것은 *동작*인데 배치를 보는 데는 필요 없다.
- **아직 열린 것**: 대상 기준. 제안은 **"컴포넌트를 둘 이상 배치하는 view"** 다 — `RootView`(22줄, `ErrorBoundary`로 `ShellView`를 감싸는 것뿐)처럼 배치라 할 것이 없는 view를 빼기 위해서다. 확정 필요.
- **린트로 갈 수 있는가**: 대상 기준이 확정되면 `arka/components-have-stories`를 넓히는 형태로 가능하다. "둘 이상 배치"는 정적 판정이 어려우니 예외 목록을 규칙 옵션으로 두는 쪽이 현실적이다.
- **딸린 정정**: 앞서 "TASK-37(Shell 헤더 잘림)이 view 스토리 덕에 드러났다"고 적었으나 **틀렸다.** 그 잘림은 기존 `workbench-shell--default`(컴포넌트 스토리)에도 그대로 있었다. 발견의 계기는 view 스토리가 아니라 **처음으로 기준 이미지를 눈으로 본 것**이다. A의 근거로 쓸 수 없다.

### B. `view/`는 배치만 한다 — 세부는 `component/`

- **무엇이 걸렸나**: A를 검토하다 드러났다. view가 UI를 직접 그리고 있어서 view 스토리가 *없는 컴포넌트의 대역*을 하고 있었다.
- **실측**:

  | 무엇 | 수 |
  |---|---|
  | `@primer/react`를 직접 import하는 view | **12개 중 9개** |
  | `component/` 폴더가 아예 없는 슬라이스 | `git`, `search` |

  `SearchView`·`SourceControlView`·`SettingsTabView`·`KeybindingsTabView`가 대표적이다 — 이 화면들은 볼 수 있는 유일한 자리가 view뿐이었다.
- **결정할 것**: view가 그리던 세부를 `component/`로 꺼낼 것인가.
- **결정**: **꺼낸다.** CONVENTIONS의 원칙 그대로다 — *"검토 부담이 커지면 그건 구조 문제다. 더 열심히 보는 게 아니라 구조를 조인다."* A와 맞물린다: view가 배치만 하면 view 스토리에서 볼 것이 "배치"로 좁혀져 컴포넌트 스토리와 겹치지 않는다.
- **아직 열린 것 — 순수 변환 함수의 행선지.** "배치만"을 세우면 지금 view에 있는 이것들의 자리를 정해야 한다.

  ```
  ShellView          mergeTabDisplay · buildTree · findLeafIdForTab · buildTabContextMenu
  DirectoryTreeView  toItem · emptyLabelOf · deleteTitleOf · deleteSubtitleOf
  ChatTabView        renderItem
  ```

  배치가 아니라 **데이터 변환**이다. `renderItem`·`emptyLabelOf`는 `ReactNode`를 반환해서 ViewModel로 못 간다(ADR 0005 — Model·ViewModel은 `ReactNode`를 갖지 않는다). 나머지는 갈 수 있다. ViewModel / 슬라이스의 `shared.ts` / "ReactNode를 만드는 것은 view의 일"로 예외 — 셋 중 하나로 정해야 흐지부지되지 않는다.
- **린트로 갈 수 있는가**: 일부는 가능하다. `view/`에서 `@primer/react` 직접 import 금지는 `no-restricted-imports`로 바로 판정된다. 다만 **위반 9건이 먼저 0이 되어야** 켤 수 있다(lint-plan의 교훈 — 전건 위반인 규칙은 규칙이 아니라 백로그다).
- **비용**: 이미 쓴 view 스토리 35개 중 상당수가 바뀌고, `git`·`search`에 `component/`를 새로 만들어야 한다. 작지 않다.

### C. `fixtures.ts`는 스토리가 쓰는 값이다 — 철회가 아니라 좁혀서 되살린다

- **무엇이 걸렸나**: 원래 규약은 "fixture는 `fixtures.ts`로 **테스트와 스토리가 공유**한다"였고 채택률이 0이었다. 2026-09-09에 한 번 철회했는데(`f7d82d5`), **두 질문을 하나로 뭉친 과잉 철회**였다.
- **갈라야 할 두 질문**:
  1. 테스트와 스토리가 데이터를 공유해야 하나 → **아니오.** `FileTree`가 근거다 — 스토리는 그럴듯한 프로젝트 트리 하나, 테스트는 단언마다 다른 최소 트리 셋(`ITEMS`·`NESTED_ITEMS`·`TWO_ITEMS`). 같은 데이터가 아니고 같아서도 안 된다. 이 판단은 유지한다.
  2. 스토리의 값을 `fixtures.ts`로 뺄 것인가 → **뺀다.** 채택률 0이라는 근거는 A 이전의 측정이라 이미 낡았다.
- **결정**: `fixtures.ts`는 **스토리가 쓰는 값**이다 — 샘플 데이터와, view 스토리가 주입할 **ViewModel 스텁**. 테스트와 공유하지 않는다.
- **왜 `Mock<Name>.ts`가 아닌가**: 이 리포에서 `Mock*`은 **계약 스위트에 걸리는 구현**을 뜻한다(8개가 전부 그렇다). VM 스텁은 그게 아니라 무해한 값 덩어리다. `MockShellViewModel.ts`로 부르면 "계약 스위트가 있어야 한다"는 잘못된 함의가 붙는다. 나누면 `Mock*` 규약이 오히려 선명해진다 — **Mock은 계약에 걸리는 것, fixture는 스토리가 쓰는 값.**
- **어디에 두나 — 쓰는 계층 옆**(`view/fixtures.ts`, `component/<Name>/fixtures.ts`). 슬라이스 루트는 안 된다: ADR 0005가 슬라이스 루트 `tokens.ts`를 기각한 이유(*"슬라이스의 모든 계약을 import하는 역방향 허브가 된다"*)가 그대로 적용된다. 계층 간 공유도 애초에 불가능하다 — `DirectoryTreeView`가 `toItem`으로 `FileTreeRow`(viewmodel 어휘) → `FileTreeItem`(component 어휘)를 변환하듯 계층마다 어휘가 다르다.
- **실측 — 뺄 분량**: VM 스텁이 view 스토리 파일의 **25~27%** 다(ShellView 42/153줄, DirectoryTreeView 36/143). 빼면 스토리 파일이 "어떤 상태를 보여줄지"의 목록으로 남는다.
- **아직 열린 것**: 언제 만드나. 컴포넌트 스토리에도 데이터가 있다(`FileTree` 60줄, `Container` 36, `SessionList` 32). 전부 빼면 파일만 는다. 제안은 **"view 스토리의 VM 스텁은 항상, 그 외 데이터는 스토리 파일이 데이터로 더 길어질 때"** 다. 확정 필요.
- **린트로 갈 수 있는가**: **아니오.** "스토리에 데이터를 두지 마라"는 판정할 수 없다. 리뷰로 본다.

### 곁가지 — `IShellViewModel`이 46개 멤버다

A를 재다 드러났다. VM 스텁이 42줄인 것은 스토리 탓이 아니라 계약이 46개짜리여서다.

```
IShellViewModel           46개 멤버
IDirectoryTreeViewModel   33개
ISourceControlViewModel   20개
```

C를 적용해 스텁을 빼면 그 무게가 한 파일에 드러난다. `workbench/` 검토 라운드(r3)에서 볼 후보다.

## 열린 후보

검토 시작 전부터 이미 미결인 것들. [ADR 0007](adr/0007-server-structure.md) `## 상태:`가 스스로 "정해지지 않았다"고 적어둔 셋이다.

### 서버 `services/`가 필요한 조건
- **무엇이 걸렸나**: `services/`가 `features/filesystem`에만 있고 나머지 슬라이스는 `transport`가 `infra`를 직접 부른다. ADR 0007이 이를 허용하지만("필요할 때만") **언제 필요한지가 문장으로 없다.**
- **결정할 것**: `transport → infra` 직결이 언제까지 합법인가.
- **린트로 갈 수 있는가**: 조건이 문장이 되면 예(계층 zone). 지금은 판정 불가.
- **상태**: 열림

### 서버에 `domain/`과 포트가 거의 없는 비대칭
- **무엇이 걸렸나**: `domain/`에 `filesystem/domain/errors.ts` 하나뿐이고 서버 전체에 `implements`가 0건이다. 서버 `infra`는 자유 함수라 구현할 인터페이스가 없다. 클라이언트의 포트/어댑터 구조와 비대칭이다.
- **결정할 것**: 이 비대칭을 유지할 것인가, 서버도 포트를 두게 할 것인가.
- **딸린 결과**: 서버 슬라이스는 계약 리뷰의 대상이 TS 인터페이스가 아니라 `contracts/`의 zod 스키마 + 라우트 시그니처가 된다. 유지하기로 하면 그 점을 CONVENTIONS에 적어야 한다.
- **린트로 갈 수 있는가**: 아니오. 설계 방향이다.
- **상태**: 열림

### `features/static/`에 `domain/`이 없는 것
- **무엇이 걸렸나**: 도메인 개념이 없어서 안 만들었다. "빈 레이어를 미리 만들지 않는다"에 부합한다.
- **결정할 것**: 의도임을 확정하고 ADR에 못박을지, 아니면 위 항목의 결론에 흡수시킬지.
- **상태**: 열림 (위 항목에 종속)

### 서버의 인메모리 구현 이름 — `Memory*` vs `Mock*`
- **무엇이 걸렸나**: TASK-33에서 "Mock이 있으면 계약도 있다"를 규칙으로 만들 수 있는지 재려다 드러났다. 클라이언트는 `Mock<Name>.ts`가 8개인데 서버는 하나도 없고, 같은 역할을 `MemoryEventStore`·`MemorySessionStore`·`ScriptedRunner`가 한다.
- **결정할 것**: 이름을 한 관행으로 모을 것인가, 아니면 "메모리 구현은 테스트용 대역이 아니라 실제 배포 가능한 구현"이라 다르게 부르는 것이 맞는가.
- **린트로 갈 수 있는가**: 이름이 하나로 모이면 예. 지금은 판정 불가.
- **상태**: 열림

## 취향 결정 대기

사용자만 정할 수 있는 것. 백로그 원본은 `backlog/tasks/`.

- **TASK-14** — [ADR 0013](adr/0013-build-and-config.md)(산출물·설정 파일의 자리)을 유지할지
- **TASK-16** — 테스트 관련 전역 폴더 정리(`packages/client/e2e`·`test/vrt`·`test/contract`)
- **TASK-17** — `index.html`을 `src/workbench`로 옮길지
