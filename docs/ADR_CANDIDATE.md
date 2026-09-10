# ADR 후보

검토 중 나온 **구조적 결정**(전역적으로 다른 부분에도 영향을 미치는 결정)을 여기 쌓는다. 유닛 하나에서만 끝나는 지적은 여기가 아니라 할 일 태스크(`docs/tasks/`)로 간다.

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

2026-09-09 검토에서 논의가 끝난 것들. **열린 항목은 없다** — 셋 다 결정까지 마쳤고 ADR 승격만 남았다.

셋이 서로를 지탱해서 따로 못 올린다 — A가 서려면 B가 필요하고, B가 서면 A의 스토리가 얇아지며, C가 A의 부산물을 담는다. 논의 중 실제로 그 맞물림이 문제를 풀었다: A의 유일한 경계 사례(`RootView`)가 부담스러웠던 이유가 "스텁 만드는 비용"이었는데 **C가 그 비용을 없앴다.**

승격 시 함께 고쳐야 하는 것 — `CONVENTIONS.md`(현재 fixtures 문장이 C의 절반만 담고 있다), `.storybook/main.ts`(view "여섯 개만"과 제외 목록), `arka/components-have-stories`의 glob, TASK-28의 결과.

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
- **대상은 모든 view다. 예외 목록을 두지 않는다.** "둘 이상 배치하는 view만"이라는 기준을 검토했다가 접었다 — 기준을 두면 그것이 다시 판단거리가 되고, 이 리포는 예외를 만드느니 문장을 실측에 맞추는 쪽을 택해 왔다(lint-plan의 파일 이름 사례).
- **경계 사례였던 `RootView`도 포함하고 자리도 `workbench/view/` 그대로 둔다.** 처음엔 "배치가 아니라 조립 결정이니 `workbench/` 루트로 옮기자"고 제안했으나 접었다. 두 가지가 걸림돌을 없앴다.
  - 비용: 토큰이 5개(`ErrorLog` + `ShellView`의 4개) 필요해 부담이라 봤는데, **C가 서면 `workbench/view/fixtures.ts`의 `ShellView` 스텁을 그대로 가져다 쓰므로 열 줄 남짓**이다.
  - 중복: `Default`는 `ShellView` 스토리와 그림이 같아 중복이 맞다. 그러나 **`Crashed`(셸이 렌더 중 죽어 `CrashScreen`으로 바뀐 그림)는 다른 어디에서도 못 본다** — `ErrorBoundary` 스토리는 최소 fallback을 쓰고 `CrashScreen` 스토리는 경계 없이 혼자 뜬다. "실제 셸이 죽었을 때 앱이 어떻게 보이는가"는 여기서만 보인다.
- **린트로 갈 수 있는가**: 예. 예외가 없으므로 `arka/components-have-stories`의 glob에 `view/`를 더하는 한 줄이면 된다. 다만 **위반이 0이 된 뒤에** 켠다.
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
- **순수 변환 함수는 `view/shared.ts`로 뺀다.** "배치만"을 세우면 지금 view에 있는 이것들의 자리를 정해야 한다.

  ```
  ShellView          mergeTabDisplay · buildTree · findLeafIdForTab · buildTabContextMenu
  DirectoryTreeView  toItem · emptyLabelOf · deleteTitleOf · deleteSubtitleOf
  ChatTabView        renderItem
  ```

  **9개 중 6개는 애초에 view를 떠날 수 없다.**

  | 함수 | 떠날 수 있나 |
  |---|---|
  | `toItem` | **못 떠남** — `IDirectoryTreeViewModel` 주석에 명시: *"ViewModel 계약은 `shared/components`를 알 수 없는 자리다"* |
  | `renderItem` `emptyLabelOf` `buildTree` `buildTabContextMenu` | **못 떠남** — `ReactNode` 반환(ADR 0005: Model·ViewModel은 `ReactNode`를 갖지 않는다) |
  | `mergeTabDisplay` | 못 떠남 — `TabContentRegistry` 조회가 필요 |
  | `findLeafIdForTab` `deleteTitleOf` `deleteSubtitleOf` | 떠날 수 있음(순수) |

  갈 수 있는 3개만 ViewModel로 보내면 변환이 두 군데로 갈라져 오히려 나빠진다. **전부 `shared.ts`로 모은다.**

  이건 새 개념이 아니라 컴포넌트에서 이미 쓰던 관례를 view에 적용하는 것이다. `FileTree/shared.ts`의 TSDoc이 의도를 그대로 적어놓았다 — *"순수 함수로 뽑는다 … 여기가 녹색이면 `FileTree.tsx`는 **이 함수들을 부르는 배선일 뿐이다.**"* "배선일 뿐"이 곧 "view는 배치만"이다.
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
- **언제 만드나 — 컴포넌트의 내용을 채우는 값이면 전부. 임계값을 두지 않는다.** "길면 뺀다" 식의 기준을 두 번 제안했다가 접었다. 길이는 다시 판단거리가 되고, 실측해 보니 길이로 가르면 성격이 같은 것이 갈라진다.
- **이름 붙은 const만이 아니라 인라인 `args` 안의 값도 포함한다.** 실측하니 그쪽이 더 크다.

  | 어디 | 줄 수 |
  |---|---|
  | 이름 붙은 데이터 const | `DirectoryTreeView` 32 · `FileTree` 23 · `FileIcon` 21 · `ShellView` 19 · `Tab` 14 · 그 외 7개 |
  | 인라인 `args` | `SearchView` 29 · `DirectoryTreeView` 21 · `SourceControlView` 19 · `ChatTabView` 19 · `FileTree` 14 · `Shell` 12 · 그 외 6개 |

  영향받는 스토리 파일은 **20개 남짓**이고, view 스토리 6개는 거의 전부가 대상이다.
- **결과로 스토리 파일은 "상태의 이름 목록"이 된다.** view 스토리는 `args`가 곧 상태라 값이 전부 빠지면 이 모양이 된다.

  ```ts
  export const Default: Story = story(FIXTURES.withResults);
  export const Empty: Story = story(FIXTURES.noMatch);
  export const Loading: Story = story(FIXTURES.searching);
  ```

  즉 남는 것은 상태 자체가 아니라 **상태의 이름**이고, 값은 옆 파일에 모인다. 스토리 파일이 "이 화면은 어떤 상태들을 갖는가"의 목차가 된다.
- **작은 것도 예외 없다** — `Dialog`(6줄), `Timestamp`(한 줄짜리 `Date.UTC(...)`)도 간다. 한때 "저건 샘플 데이터가 아니라 시나리오 장치"라고 갈라 보려 했으나, **컴포넌트가 그리는 내용을 채우는 값이면 전부 데이터**라는 정의로 통일한다.
- **린트로 갈 수 있는가**: **아니오.** "스토리에 값을 두지 마라"는 정적으로 판정할 수 없다. 리뷰로 본다.

### D. 계층은 계층 이름으로만 부른다 — 포트·어댑터를 쓰지 않는다

- **무엇이 걸렸나**: ADR 0007 재검토 중 내가 서버의 `domain/`↔`infra/` 관계를 "포트/어댑터"로 설명했다가 지적받았다. 확인해 보니 **어디에도 이 어휘를 쓴다고 정한 곳이 없는데 리포 안이 이미 갈려 있었다.**
- **실측**: 코드 식별자 **22개**(`create*Port` 9, `*Adapter` 11, `TextClipboardPort`·`ScriptedPort`·`watchPort`), 문서 **9곳**(ADR 0019:26 "### 실행기는 포트다", 0007:68 "포트/어댑터 구조", 0008:36·CONVENTIONS:182 "클라이언트 어댑터").
- **결정**: **계층 이름으로만 부른다** — client는 `component`·`view`·`viewmodel`·`model`·`infra`, server는 `transport`·`services`·`domain`·`infra`. 헥사고날 용어를 들여오지 않는다.
- **왜**: ADR 0007이 기각 항목에 *"client와 server의 폴더 이름 통일 — 역할이 달라 같은 이름을 붙이면 오히려 헷갈린다"*를 이미 적어뒀다. 이름을 하나로 합치는 것을 거부해 놓고 제3의 이름을 얹으면 어휘가 셋이 된다. 그리고 필요한 말은 ADR 0005가 이미 갖고 있다 — *"`model`이 선언하는 인터페이스는 자기 것이 아니라 `infra`가 구현할 것이다"*. 새 용어 없이 같은 것을 말한다.
- **범위**: 문서가 먼저다. 식별자 22개는 별도 태스크로 미룬다 — 이름만 바꾸는 커밋이 커서 검토를 가린다.
- **린트로 갈 수 있는가**: 예. 문서·주석에서 `포트`/`어댑터`/`Port`/`Adapter`를 금지하는 것은 판정 가능하다. 다만 **식별자 22개가 먼저 0이 되어야** 켤 수 있다(전건 위반인 규칙은 규칙이 아니라 백로그다).
- **상태**: 수렴함 — ADR 승격 대기

### E. 세 패키지의 최상위 폴더를 한 어휘로 맞춘다

- **무엇이 걸렸나**: ADR 0007 재검토. 같은 개념을 세 이름으로 부르고 있었다 — `client/shared` · `contracts/common` · 서버는 그 자리가 아예 없음.
- **결정**:

  | | 지금 | 결정 |
  |---|---|---|
  | client | `core/` `workbench/` `extensions/` `shared/` | 그대로 |
  | server | `core/` `features/` | `core/` `features/` **`shared/`** |
  | contracts | `common/` + 슬라이스가 루트에 흩어짐 | **`shared/`** + **`features/`** 아래로 |

- **서버는 "마이크로커널의 전단계"다.** `app.ts`를 확인하니 다섯 feature를 이름으로 직접 부른다(`createAgentFeature`·`createGitRoutes` …) — 레지스트리도 자기등록도 없는 조립 루트다. 클라이언트 `registerServices.tsx`와 같은 모양이고, ADR 0005가 그것을 정직하게 "전단계"라고 부른다. 서버도 같은 표현을 쓴다 — "마이크로커널"이라고 쓰면 코드가 하지 않는 것을 주장하게 된다.
- **`core/workspace.ts`는 `shared/`로 간다.** 처음엔 "도메인 개념이니 `features/`로"를 검토했으나 **`arka/slices-are-siblings`에 걸린다** — 그 파일의 TSDoc이 스스로 *"앱 수준 개념이다. 파일·검색·git·에이전트 툴이 전부 같은 루트를 본다"*고 적고 있어, 어느 한 feature에 넣으면 나머지 넷이 그걸 import해야 한다. 실측하면 `app.ts`만 import하고 feature들은 `workspace.root`(문자열)나 자기 안에 선언한 구조 타입을 받는다.
- **`shared/`는 `log.ts` + `workspace.ts` 둘로 시작한다.** 하나로 시작하면 "빈 레이어를 미리 만들지 않는다"와 부딪친다.
- **린트로 갈 수 있는가**: 예 — `shared/`가 아무것도 import하지 않는다는 zone은 클라이언트에 이미 있다. 서버·contracts에 같은 zone을 더한다.
- **상태**: 수렴함 — ADR 승격 대기 (0007 재작성에 반영)

### F. 계약은 양방향으로 검증한다 — 통합 테스트를 계약 테스트로 부르지 않는다

- **무엇이 걸렸나**: 루트 `test/contract/`가 클라이언트 어댑터와 서버 앱을 **한 프로세스에 올려** 계약 스위트를 돌렸다. 이름은 계약 테스트인데 실제로는 **통합 테스트**였다.
- **왜 문제인가**: 계약 테스트의 핵심은 **양쪽이 서로를 모른 채 같은 계약에 각자 대는 것**이다. 지금 형태는 셋을 못 한다.
  - 클라이언트가 둘이 되면 클라이언트마다 서버를 붙여 돌리게 된다. 안 늘어나는 구조가 아니다.
  - **서버의 계약 준수를 클라이언트를 통해서만 알 수 있었다.** 어느 클라이언트도 붙이지 않으면 서버가 스키마를 지키는지 말할 수 없다.
  - HTTP API는 이미 경계다. 두 쪽이 이어지는지를 따로 볼 이유가 없다.
- **실측한 비대칭**: 서버는 **요청만 검증하고 응답은 검증하지 않았다.** `fsRoutes.ts`가 `WriteFileRequest.safeParse(...)`로 요청은 보면서 응답은 `c.json(await listDirectory(...))`로 그냥 내보낸다. 응답 스키마(`DirectoryListing`·`FileContent`)를 서버는 `import type`으로만 쓴다 — 런타임 검증은 클라이언트 어댑터의 `parse`에서만 일어났다.
- **결정**: 계약을 **양방향**으로 검증한다.

  | 어디 | 무엇을 | 상대를 아는가 |
  |---|---|---|
  | client | 어댑터가 스키마대로 보내고 받는가 — `Mock*`에 대고 계약 스위트 | 서버를 모름 |
  | server | 라우트 응답이 스키마를 통과하는가 — `responseContract.ts` | 클라이언트를 모름 |

- **딸린 결과**: 루트 `test/`가 통째로 사라졌다. **모든 테스트가 자기 패키지 안에 있다**가 성립한다. `client`↔`server` import 금지 zone에 예외를 둘 이유도 없어졌다.
- **아직 열린 것 — 런타임에도 검증할지.** 지금은 테스트에서만 응답을 `parse`한다. 프로덕션 코드에서도 하면 서버가 계약 위반을 스스로 못 내보내지만 응답마다 zod 비용을 문다. ADR 0007이 *"zod 스키마가 원본이고 타입은 `z.infer`로 뽑는다"* 고만 하고 **어느 방향을 검증하는지는 안 정했다** — 그 빈자리가 이 비대칭의 원인이다.
- **린트로 갈 수 있는가**: 부분적으로. "`transport/`의 라우트마다 응답 계약 테스트가 있다"는 파일 존재로 판정 가능하다. 다만 지금은 라우트↔스키마 대응이 코드에 선언돼 있지 않아 그 매핑을 먼저 만들어야 한다.
- **상태**: 수렴함 — ADR 0007 재작성에 반영

### 곁가지 — `IShellViewModel`이 46개 멤버다

A를 재다 드러났다. VM 스텁이 42줄인 것은 스토리 탓이 아니라 계약이 46개짜리여서다.

```
IShellViewModel           46개 멤버
IDirectoryTreeViewModel   33개
ISourceControlViewModel   20개
```

C를 적용해 스텁을 빼면 그 무게가 한 파일에 드러난다. `workbench/` 검토 라운드(r3)에서 볼 후보다.

### 딸린 것 — `shared.ts` 이름이 셋으로 갈려 있다

B가 서면 함께 정리해야 한다. 같은 개념인데 이름이 셋이다.

```
component/FileTree/shared.ts   ← shared      (순수 함수 5개 파일)
viewmodel/share.ts             ← share       (공유 상수 GHOST_ID)
model/tabsShare.ts             ← <무엇>Share (공유 상수, 기본 leaf id)
```

`arka/file-names`는 셋 다 유효한 camelCase라 못 잡는다. **`shared.ts`로 통일한다** — 대상 폴더에 같은 이름이 없어 그대로 옮기면 된다.

한 가지 딸린 결과: 컴포넌트 폴더의 `shared.ts`는 순수 **함수**이고 나머지 둘은 공유 **상수**다. 이름을 합치면 `shared.ts`의 뜻이 *"이 폴더 안에서 나눠 쓰는 것"* 으로 넓어진다. 그 정의를 ADR에 한 줄로 적는다.

## 열린 후보

검토 시작 전부터 이미 미결인 것들. [ADR 0007](adr/0007-server-structure.md) `## 상태:`가 스스로 "정해지지 않았다"고 적어둔 셋이다.

### 서버 `services/`가 필요한 조건
- **무엇이 걸렸나**: `services/`가 `features/filesystem`에만 있고 나머지 슬라이스는 `transport`가 `infra`를 직접 부른다. ADR 0007이 이를 허용하지만("필요할 때만") **언제 필요한지가 문장으로 없다.**
- **결정할 것**: `transport → infra` 직결이 언제까지 합법인가.
- **린트로 갈 수 있는가**: 조건이 문장이 되면 예(계층 zone). 지금은 판정 불가.
- **상태**: 열림

### 서버는 feature마다 인터페이스 유무가 갈린다
- **무엇이 걸렸나**: 처음엔 ADR 0007의 `## 상태:`를 그대로 옮겨 "`domain/`에 파일 하나뿐, `implements` 0건"이라고 적었는데 **실측해 보니 셋 다 거짓이었다** — `domain/`에 9개 파일, `implements` 6건, `services/`도 존재한다. 0007의 서술이 0019(에이전트 도메인) 이후 갱신되지 않은 것이다.
- **실제 모습**: `agent`만 `domain/`에 인터페이스 4개와 `implements` 6건을 갖고, `filesystem`·`git`·`search`·`static`은 0개다.
- **결정할 것**: 이 갈림이 규칙의 결과인가 드리프트인가.
- **유력한 설명**(미확정): 서버는 `Mock*`이 **0개**이고 테스트가 `mkdtemp`·실제 `git init`으로 **실물을 쓴다**. 대역이 없으니 구현이 하나뿐이고, 구현이 하나면 인터페이스가 통과 계층이 된다. 반면 `agent`는 `ScriptedRunner`↔`AnthropicRunner`, `Memory*`↔`Sqlite*`로 **진짜 바꿔 낀다**. 클라이언트는 `Mock*`이 16개라 항상 구현이 둘이다. 이 설명이 맞다면 규칙은 "**바꿔 낄 것이 있으면 `domain/`이 인터페이스를 선언하고, 실물을 그냥 쓰면 자유 함수**"가 된다.
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

사용자만 정할 수 있는 것. 원본은 `docs/tasks/`.

- ~~**TASK-14** — 산출물·설정 파일의 자리~~ 2026-09-10 해소. 산출물의 자리는 [ADR 0002](adr/0002-repo-root.md)로, 설정의 자리는 [ADR 0003](adr/0003-live-next-to-what-they-govern.md)으로 갈렸다
- ~~**TASK-16** — 테스트 관련 전역 폴더 정리~~ 2026-09-09 해소. `vrt`는 `packages/client/`로, `test/contract`는 후보 F로 갈려 사라졌다
- **TASK-17** — `index.html`을 `src/workbench`로 옮길지
