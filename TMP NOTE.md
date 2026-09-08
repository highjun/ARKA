TMP NOTE

## 3. 클라이언트 구조

`<scheme>://<authority:node>/<path>`

### 폴더

```
client/src/
  core/         di, transport, types — 기능 없음, 꽂을 자리만
  features/     기능별 수직 슬라이스
  shared/       UI 프리미티브, 순수 유틸
  app/          진입점, 레이아웃, bootstrap
```

### feature 내부 — MVVM + Data 계층

```
features/<name>/
  model/        도메인 타입·규칙 + infra가 구현할 인터페이스 선언
  infra/        I/O 구현 (필요할 때만)
  viewmodel/    화면 상태 + 프레젠테이션 로직 (MobX)
  view/         React 컴포넌트
  index.ts      공개 표면
```

### 계층별 정의

| 계층 | 담당 | 판별 질문 | 금지 |
|---|---|---|---|
| view | UI 기술 | 지우면 모양만 사라지는가 | 로직, viewmodel 외 상태 소스 |
| viewmodel | 프레젠테이션 로직 | 화면이 없으면 존재하지 않는가 | DOM 조작, 도메인 판단 |
| model | 도메인 규칙 | CLI여도, 저장소가 바뀌어도 유효한가 | React, fetch, window, 전역 상태 |
| infra | I/O 기술 | 테스트에 mock이 필요한가 | React |

**중요**: `model/`은 I/O를 **정의**하되 특정 구현에 의존하지 않는다. 인터페이스 선언은 `model/`, 실제 `fetch`를 쓰는 구현은 `infra/`.

```
infra ──implements──→ model
```

화살표가 안쪽을 향한다. `model/`은 `infra/`의 존재를 모르고, 어떤 구현이 꽂힐지는 `bootstrap.ts`가 결정한다.

**`infra/`는 필요할 때만.** 실제 I/O가 없는 feature(레이아웃 설정 등)는 3폴더로 끝.


### 절대 규칙

1. **의존성 단방향**: `view → viewmodel → model ← infra`
2. **features 간 직접 import 금지** — DI(`useService`) 또는 이벤트로만
3. **`shared/`는 `features/`를 import 불가** — `contracts/`와 외부 라이브러리만
4. **공통 추출은 아래로만** (`features → shared`), 옆으로 절대 금지

이 규칙들은 나중에 마이크로커널로 전환하기 위한 조건이기도 하다.

### 바인딩

```
model     ──Emitter 이벤트──→ viewmodel
viewmodel ──MobX observer───→ view
```

계층마다 다른 메커니즘. **model은 MobX를 모르고, view는 Emitter를 모른다.**

`model/`이 observable을 가지면: MobX에 묶이고, 상태 소유자가 모호해지고, 순수 테스트가 불가능해진다. model은 **사실(fact)과 사건(event)**을, viewmodel은 **화면 상태(state)**를 다룬다.

비동기 콜백에서 observable을 바꿀 땐 `runInAction`으로 감싼다. 이벤트를 배열로 받는 이유도 여기 있다 — 한 번의 액션으로 묶어야 리렌더가 한 번.

---

## 4. ViewModel — MobX

### 결정

| 결정 | 기각 | 이유 |
|---|---|---|
| MobX | Zustand | 인터페이스/구현 분리 → **계약 우선 리뷰 가능** |

**추가 이점**
- 생성자 주입이 DI와 자연스럽게 맞음
- `dispose()` 라이프사이클이 명확 → side effect 통제
- 인터페이스가 있어 Storybook mock이 쉬움
- 서버(클래스+생성자 주입)와 스타일 통일

**비용**
- 번들이 조금 큼
- `observer` 누락 시 조용히 리렌더 안 됨 → **ESLint `mobx/missing-observer` 필수**

### 형태

```ts
// viewmodel/IFileTreeVM.ts  ← 리뷰 대상
export interface IFileTreeVM {
  readonly nodes: readonly TreeNode[]
  readonly loading: boolean
  expand(uri: URI): Promise<void>
}

// viewmodel/FileTreeVM.ts  ← 구현
export class FileTreeVM implements IFileTreeVM {
  constructor(private fs: IFileSystem) {
    makeAutoObservable(this)
    this.sub = fs.onDidChangeFile(e => this.applyChanges(e))
  }
  dispose() { this.sub.dispose() }
}
```

**ViewModel은 Model의 래퍼가 아니다.** Model에 없는 것을 갖는다 — selected, expanded, loading, sortBy 같은 **화면에만 존재하는 상태**.

**ViewModel은 항상 인터페이스로 Model을 참조**한다(생성자 주입). 구현체를 직접 import하지 않는다.

**ViewModel끼리 직접 참조 금지.** 같은 feature 내 상위→하위 소유는 허용. 다른 feature면 model 계층의 이벤트로 소통.

---

## 5. DI

### 결정

| 대상 | 결정 | 이유 |
|---|---|---|
| 클라이언트 | **자체 구현 (~100줄)** | 번들 경량, React 라이프사이클 통제, 필요 기능이 적음 |
| 서버 | **Awilix** (서비스 3~4개 넘을 때) | Session/Run 스코프 + disposer가 정확히 이 용도 |

기각: Inversify(reflect-metadata로 무거움), 클라이언트에 Awilix(Proxy 기반이라 트리쉐이킹 불리)

**자체 구현에 시간을 많이 쓰지 말 것.** 100줄 이상 정교해지고 싶어지면 라이브러리로 갈아타는 게 맞다.

### 필수 기능

- 토큰 기반 (symbol) — 문자열 키 대신
- 계층 스코프
- dispose
- 순환 의존 감지 (없으면 스택 오버플로로 터지고 원인 추적이 매우 어려움)

### 스코프 규칙

```
Root
 ├─ 공유 서비스
 └─ ChildScope
      자기 서비스
```

- **위로만 참조** (자식 → 부모). 형제는 볼 수 없음
- **아래로만 정리** (dispose 전파)
- 공유하려면 부모 스코프에 등록
- 자식에 같은 토큰 재등록 = 오버라이드 (테스트 mock)

**React StrictMode 주의**: effect 이중 실행으로 스코프가 즉시 dispose될 수 있음. 개발 중 "VM이 죽었다"는 증상이 나오면 여기를 의심.

### 원칙

**모든 걸 DI에 넣지 말 것.** 순수 함수 유틸은 그냥 import. DI는 "교체 가능성이 있거나 라이프사이클이 있는 것"에만.

---

## 6. 서버 구조

```
server/src/
  core/          DI, 이벤트, 라이프사이클 (도메인 모름)
  domain/        도메인 타입·규칙·인터페이스
  services/      유스케이스 (요청-응답)
  infra/         DB, FS, 외부 API
  transport/     HTTP 라우트, SSE
  runtime/       장기 실행 작업 (나중)
  bootstrap.ts
```

### 클라이언트와의 대응

| 클라이언트 | 서버 | 역할 |
|---|---|---|
| view | transport | 바깥 세계와의 접점 |
| viewmodel | services | 유스케이스 조율 |
| model | domain | 도메인 규칙 |
| infra | infra | I/O 구현 |

의존 방향 동일: `domain`이 안쪽, 나머지가 안쪽을 향함.

### services vs runtime

> **클라이언트가 다 나갔다가 10분 뒤 돌아왔을 때, 그동안 무슨 일이 있었는지 보여줘야 하는가?**

- **아니다 → `services/`** — 파일 watch 같은 스트리밍도 여기. 연결이 끊기면 아무것도 안 남으므로 요청-응답의 연장선
- **그렇다 → `runtime/`** — 에이전트 Run. 작업이 요청 수명보다 오래 살고, 영속화·재개가 필요

`runtime/`은 에이전트 때문이 아니라 **장기 실행 때문에** 생긴다. 나중에 배치 평가 등도 같은 인프라를 쓰므로 에이전트 전용으로 설계하지 말 것.

### 스코프 계층

```
App → Workspace → Session → Run
```

Run 스코프를 dispose하면 LLM 요청 취소, 툴 프로세스 종료, 스트림 정리가 한 번에.

### 규칙

**라우트 핸들러에 로직 금지.** 검증 → 서비스 호출 → 응답만.

```ts
app.post('/fs/read', async (req) => {
  const body = ReadFileRequest.parse(req.body)
  const content = await fs.readFile(URI.parse(body.uri))
  return ReadFileResponse.parse({ content: encode(content) })
})
```

---

## 7. 파일시스템 설계

### 프로바이더 패턴

```ts
interface IFileSystemProvider {
  readonly scheme: string
  readonly readonly?: boolean

  stat(uri): Promise<FileStat>
  readDirectory(uri): Promise<DirEntry[]>
  readFile(uri): Promise<Uint8Array>
  writeFile(uri, content, opts): Promise<void>
  delete(uri, opts): Promise<void>
  rename(from, to, opts): Promise<void>
  createDirectory(uri): Promise<void>
  onDidChangeFile(listener: (events: FileChangeEvent[]) => void): Disposable
}
```

**지금은 `file:` 프로바이더 하나만 구현.** 인터페이스는 확장 가능하게.

**패턴의 진짜 값**: 여러 백엔드 지원이 아니라 **모든 것을 파일처럼 다룰 수 있게 되는 것**. 에이전트 실행 결과, 프롬프트 히스토리, 데이터셋 샘플을 전부 "열어볼 수 있는 무언가"로 만들면 UI를 새로 만들 필요가 없다.

### 핵심 결정 3가지

**(a) 변경 이벤트는 배열로 배치 전달**

```ts
onDidChangeFile(listener: (events: FileChangeEvent[]) => void)
```

에이전트가 파일 50개를 만들면 이벤트도 50개. 하나씩 오면 리렌더가 50번.

**(b) 파일과 문서를 분리**

- 파일 = 디스크의 바이트
- 문서 = 편집 중인 메모리 상태 (dirty, undo 스택, 커서)
- 하나의 파일을 여러 탭에서 열어도 문서 모델은 하나
- 저장은 문서 → 파일 방향의 명시적 커밋

이걸 분리해야 "에이전트가 파일을 수정했는데 사용자가 그 파일을 열어놓고 있는" 충돌을 다룰 수 있다.

**(c) etag로 충돌 감지**

```ts
interface WriteOptions {
  create: boolean
  overwrite: boolean
  etag?: string   // 있으면 일치할 때만 쓰기
}
```

충돌은 에러가 아니라 **해결해야 할 상태**. diff를 보여주고 선택하게 하는 UX가 필요.

### 에러 타입

```ts
export enum FileErrorCode {
  NotFound, NoPermission, Exists, NotADirectory,
  IsADirectory, Conflict, Unavailable,
}
```

**지금 정의해야 한다.** 클라이언트가 원격 프로바이더를 쓰므로 HTTP 상태코드를 이 코드로 변환해야 하는데, 나중에 하면 에러 처리가 곳곳에 흩어진다.

### 지금 하지 말 것

- `watch()` 경로별 구독 — 서버가 이벤트를 통째로 스트림. 파일이 수천 개 될 때 최적화
- `copy()`, `readFileStream()` — 필요해지면

---

## 8. 디자인 시스템

### 스택

| 결정 | 기각 | 이유 |
|---|---|---|
| Radix UI (headless) | MUI, Ant Design | 완성형은 자체 디자인 언어가 강해 IDE 밀도로 오버라이드가 더 힘듦 |
| CSS Modules | Tailwind | 토큰을 CSS 변수로 직접 통제. 익스텐션에 변수만 노출하면 됨 |
| Primer primitives **값 복사** | npm 의존성, 자체 설계 | 업데이트가 UI를 바꾸지 않게. 팔레트·스케일 설계 시간 절약 |

**Radix를 쓰는 추가 이유**: controlled/uncontrolled 하이브리드가 이미 구현되어 있고, 그 API 컨벤션을 우리 컴포넌트에 따르면 일관됨.

### 토큰 2층

```
primitive.css   --gray-900, --space-2, --text-size-2   (Primer에서 복사)
semantic.css    --ade-bg-surface, --ade-control-height  (우리가 정의)
```

**컴포넌트는 `--ade-*`만 참조.** primitive 직접 사용 금지 → **Stylelint로 강제**.

**semantic 이름을 색 이름으로 짓지 말 것.** `--ade-gray-bg` ❌ → `--ade-bg-surface` ✅. 라이트 테마 추가가 매핑 변경만으로 끝난다.

### 필요한 토큰 카테고리

색(bg/text/border/accent/status), 간격, 타이포(UI 폰트 + 모노 폰트), 크기(행 높이/아이콘/컨트롤), 레이어(z-index), 모션, 반경/보더.

**모노 폰트가 별도로 필요** — 파일 경로, 코드, 로그에 쓰이고 UI 폰트와 다르다.

**z-index를 미리 정할 것** — IDE는 겹치는 UI가 많아 나중에 정하면 반드시 충돌한다.

### 밀도 모드

IDE 밀도(행 높이 22px)와 터치 타겟(44px)이 충돌한다.

```css
:root { --ade-control-height: 24px; }
[data-density="touch"] { --ade-control-height: 44px; }
```

컴포넌트는 변수만 참조하고, 셸이 밀도를 결정한다.

### 에디터 테마 연동

CodeMirror/Monaco는 자체 테마 시스템을 갖고 있어 그냥 두면 **사이드바는 어두운데 에디터만 밝은** 상태가 된다.

```ts
// features/editor/infra/themeAdapter.ts
export function toEditorTheme(tokens: DesignTokens): EditorTheme
```

미루면 오래 방치된다.

### controlled / uncontrolled

`shared/ui`는 **둘 다 지원**. 사용 시 기준은 폴더가 아니라 **상태의 성격**:

> **다른 누군가가 이 상태를 읽거나 바꿀 일이 있는가?**

- 없다 → uncontrolled로 **숨기는 게 낫다** (툴팁, 팝오버, 호버). ViewModel 인터페이스가 작을수록 리뷰가 쉽다
- 있다 → controlled, ViewModel이 소유 (Drawer, Dialog)

**추가 신호**: 커맨드로 노출될 만한 동작이면 무조건 controlled.

`useControllableState` 훅으로 통일하되, **모든 컴포넌트에 넣지 말 것.** prop이 3배로 늘어난다. 상태를 가진 컴포넌트에만.

---

## 9. 마이크로커널 (미도입)

### 현재 구조와의 관계

```
[현재]   app → features          조립자가 기능을 앎 (정적 조립)
[커널]   extensions → workbench  기능이 자리를 앎
```

**화살표가 반대다.** 다른 구조지만, 앞의 규칙(직접 import 금지, 좁은 공개 표면, DI 경유)을 지키면 전환이 **이동 수준**으로 끝난다. 어기면 전면 재작성.

### 구성요소와 도입 신호

| 요소 | 상태 | 신호 |
|---|---|---|
| Service Registry | ✅ DI | — |
| Command Registry | 다음 | 같은 동작에 진입점 2개 이상 |
| Event Bus | Emitter로 대체 중 | Emitter 3~4개 쌓임 |
| Contribution Point | 나중 | 뷰가 정적 관리 안 될 때 (패널 5~6개) |
| Lifecycle | 스코프로 절반 | 플러그인 붙일 때 |
| Extension Host | 나중 | **남의 코드 실행 전 필수** |

### 세 통신 수단의 구분

| | 형태 | 반환 | 관계 |
|---|---|---|---|
| Service | "이 능력을 다오" | 객체 | 지속적 참조 |
| Command | "이걸 실행해라" | 있음 | 1:1, 일회성 |
| Event | "이게 일어났다" | 없음 | 1:N, 통지 |

**대체재가 아니다.** Command만으로 가면 모든 게 문자열과 `any`가 되어 타입 안전성과 리팩터링 지원을 잃는다. VSCode도 셋을 다 갖고 있다.

### 전환 후 계층

```
core        도메인도 UI도 모름 — 조립과 중개
workbench   UI는 알지만 도메인은 모름 — 꽂을 자리 제공 + 운영
extension   둘 다 앎 — 자리를 채움
```

**workbench vs extension 판별**: "이 코드가 파일·Git·에이전트 같은 특정 도메인 개념을 아는가?" 안다 → extension.

**core vs workbench 판별**: "이 코드가 화면 없이도 의미가 있는가?" 있다 → core.

### 원칙

- **내장 기능도 플러그인과 같은 API를 쓴다.** 어기면 API가 곧 썩는다
- **익스텐션도 자기 확장 지점을 열 수 있다** — 관계는 재귀적
- 익스텐션 간 협력은 **서비스 레지스트리 경유를 기본으로**. 직접 API export는 정말 필요할 때만 (활성화 순서·버전 호환·순환 의존 문제가 전부 직접 참조에서 생김)

### 전환 전제

**공개 API 안정화.** 그 전에 열면 익스텐션이 매주 깨져서 아무것도 못 만든다.

---

## 10. 에이전트 런타임 (Phase 5)

### 이벤트 로그

실행 상태를 "현재 값"이 아니라 **append-only 이벤트 시퀀스**로 저장.

```
seq 1: RunStarted
seq 2: StepStarted
seq 3: ToolCallRequested
seq 4: ApprovalRequested      ← HITL로 멈춤
seq 5: ApprovalGranted
seq 6: ToolCallCompleted
seq 7: TokenDelta × N
seq 8: RunCompleted
```

**이 형태여야 하는 이유**
- 재접속 시 `seq > 마지막수신`만 전송 (모바일 필수)
- 여러 클라이언트가 같은 Run을 동시에 관측
- 리플레이·타임트래블 디버깅이 공짜
- 관측성(트레이스, 토큰 사용량)이 부가기능이 아니라 기본

시퀀스는 **Run 단위 단조증가**. 전역 순서 불필요.

**저장소는 SQLite 테이블 하나로 충분.** Kafka는 초당 수만 이벤트·다중 팀 소비 상황용이고, 여기선 운영 부담만 크다.

**OpenTelemetry span 구조와 호환되게 설계할 것.** 내부 관측과 사용자용 트레이스 뷰가 같은 데이터를 쓴다. 나중에 맞추려면 재작성.

### 상태 기계

```
pending → running → completed
             ├────→ failed
             ├────→ cancelled
             └────→ waiting_approval → running   ← 에이전트 특유
```

`waiting_approval`이 상태 기계를 상당히 복잡하게 만든다.

### 모바일 대응

- 재연결 시 `Last-Event-ID` 기반 이어받기
- **토큰 델타 배칭** — 초당 수십 개를 그대로 보내면 클라이언트가 죽는다. 데스크톱은 원본, 모바일은 100ms 배치. 클라이언트가 구독 시 프로파일 선언

### 툴 실행

로컬 단일 사용자라 **보안 격리는 불필요**. 안정성 격리(툴 무한루프가 서버를 멈추지 않게)만 유용.

**단, 인터페이스 뒤에 둘 것.**

```ts
interface IToolExecutor {
  execute(tool: ToolDef, args: unknown): Promise<Result>
}
```

인프로세스로 시작하고 나중에 프로세스/컨테이너로 교체 가능하게.

### 클라이언트 대응 개념

DI 상위 스코프가 그 역할을 한다. 별도 계층은 대개 불필요 — 브라우저를 닫으면 어차피 사라지고, 진짜 오래 걸리는 건 서버가 한다.

필요해지는 경우: 오프라인 큐, 낙관적 업데이트+롤백, 다중 파일 작업. 사례가 쌓이면 그때 슬라이스를 만든다.

---

## 11. 검증

### 도구가 검사하는 것

| 항목 | 도구 |
|---|---|
| 구조 위반 (경계 넘기) | ESLint `import/no-restricted-paths` |
| model에 fetch/React 유입 | ESLint `no-restricted-globals`, `no-restricted-imports` |
| primitive 토큰 직접 사용 | Stylelint |
| observer 누락 | `mobx/missing-observer` |
| 타입 | tsc |
| 계약 준수 | 계약 테스트 |
| UI 모양 | Storybook |

**새로운 실수 패턴을 발견하면 지적하지 말고 규칙을 추가한다.** 한 번 만들면 영구히 작동한다.

### 린트 설정도 관리 대상

- **각 규칙에 `message`로 대안 명시** — 없으면 `eslint-disable`로 우회한다
- fixtures 테스트 (valid/invalid) — 규칙 수정 시 회귀 방지
- `eslint-comments/require-description` — 이유 없는 disable 금지
- disable 개수 추적 — 늘어나면 규칙이나 구조가 잘못된 신호
- **eslint/stylelint/tsconfig 변경은 `contracts`급으로 검토**

### 테스트

**계약 테스트가 중심.**

```ts
// model/__contract__/provider.contract.ts
export function testFileSystemProvider(name: string, setup: () => ...) {
  describe(`IFileSystemProvider: ${name}`, () => {
    it('없는 파일에 NotFound를 던진다', ...)
    it('쓰기 후 읽으면 같은 내용이 나온다', ...)
    it('etag가 다르면 Conflict를 던진다', ...)
  })
}
```

**단위 테스트와의 차이**: 계약 테스트는 인터페이스를 구현한 **모든 것**이 통과해야 하고, 함수로 export되어 재사용된다.

**이 프로젝트에서 중요한 이유**
- mock이 실물과 같이 동작한다는 보장 (Storybook·테스트 신뢰성)
- 서버(LocalDisk)와 클라이언트(Remote)가 같은 스위트를 공유 → 동작 일치 보장
- 에이전트 작업의 안전망 → 구현 검토를 줄일 수 있음

**단위 테스트는 계약이 못 잡는 것만**: 인터페이스 없는 순수 함수(경로 정규화, etag 비교), 상태 전이, 에러 변환.

**단위 테스트가 적을수록 좋은 신호.** 많아지면 대개 구조 문제 — ViewModel에 도메인 로직이 샜거나, infra에 로직이 쌓였거나.

**계층별 비중**: `model/` 집중, `viewmodel/` 중간, `view/` 스모크(렌더·이벤트 연결만).

**테스트하지 말 것**: getter/setter, 라이브러리 동작, 구현 세부사항(내부 호출 횟수), 스냅샷.

**커버리지 숫자를 목표로 삼지 말 것.** 대신:

> **이 코드가 잘못 동작하면 누가/무엇이 알려주는가?** 아무도 안 알려주면 테스트 필요.

"눈으로 보면 안다"는 성립하지 않는다 — 에이전트가 예상 밖의 곳을 건드리고, 나는 그 화면을 안 보고 있다.

### Storybook

**커버 범위** (넓게 잡는다 — 시각 검토가 목적)
- `shared/ui` 전부
- `features/*/view/` 프레젠테이션 컴포넌트
- 컨테이너는 주요 상태만

**최소 세트**: 기본 / 빈 / 로딩 / 에러. 에이전트가 빼먹기 쉬운 게 빈 상태와 에러.

**mock VM을 DI로 주입**

```tsx
const c = new Container('story')
c.registerValue(FileTreeVMToken, new MockFileTreeVM({ nodes: sampleNodes }))
```

인터페이스만 구현하면 되고 MobX도 필요 없다. **스토리 작성이 쉬운 게 좋은 구조의 증거.**

**부수 효과**: view를 "props만 받는 프레젠테이션"과 "VM을 구독하는 컨테이너"로 나누는 습관이 생긴다.

**밀도·테마 데코레이터**로 모바일에서 깨지는 걸 잡는다. 실기기 테스트보다 빠르다.

**CI에 스토리 빌드 포함** — 깨진 스토리 감지. 시각 회귀 도구는 UI가 안정되는 Phase 3~4에.

### 문서화

| 대상 | TSDoc | 인라인 주석 |
|---|---|---|
| `model/`·`contracts/` 인터페이스 | **필수** | 도메인 규칙의 근거만 |
| `infra/` | 선택 | **필수에 가까움** (외부 시스템 특성) |
| `viewmodel/` 인터페이스 | **필수** | |
| `view/` | 불필요 | 거의 없어야 정상 |

**TSDoc에 반드시 포함**: 던질 수 있는 에러, 부수효과(구독·dispose 필요 여부), 제약 조건.

**쓰지 말 것**: 타입이 이미 말하는 것.

**인라인 주석은 "왜"만.** "무엇"을 설명하는 주석 금지. **에이전트 생성 코드에 이게 대량으로 붙으므로 리뷰에서 제거를 요구.**

**남길 것**: `CONVENTIONS.md`, ADR, `model/` TSDoc, "왜" 주석

**버릴 것**: Doc-gen — 에이전트는 소스를 직접 읽으므로 재포장 문서에서 얻을 정보가 없고, 낡은 생성 문서는 오히려 해롭다

**ADR 형식**: 제목 / 맥락 / 결정 / **기각한 것과 이유**. 마지막이 필수 — 없으면 이미 기각된 방향이 반복 제안된다.

주석에 긴 배경 설명이 들어가면 ADR로 옮기고 링크만 남긴다.

### 중복 제거 기준

- **2회 반복** → 그냥 둔다 (성급한 추상화가 더 해롭다)
- **3회 + 같은 이유로 함께 변경됨** → 추출
- **모양만 같고 변경 이유가 다름** → 추출하지 않는다

---

## 12. 운영

### 지금 필요한 것

- CI: 타입체크 → 린트 → 테스트 → 빌드 (앞에서 걸리면 뒤를 안 돌림)
- docker-compose (서버 + **SQLite**)
- 구조화 로깅 (JSON)
- 루트에 `check = typecheck && lint && test` — 에이전트가 제출 전 하나만 돌리면 되게

**저장소는 SQLite.** 로컬 단일 사용자에 Postgres는 과하다. 컨테이너 하나로 끝나고, 백업이 파일 복사고, 이벤트 로그도 충분히 감당한다.

### 코드에 미리 넣을 4가지

없으면 나중에 전면 수정이 되는 것들. 전부 값이 싸다.

| 항목 | 지금 형태 |
|---|---|
| 인증 컨텍스트 자리 | `{ userId: 'local' }` 고정값. **요청에 인증 컨텍스트가 흐르는 경로**를 만들어두는 게 목적 |
| Workspace 개념 | 경로 하드코딩 대신 `WorkspaceService` |
| 프로토콜 버전 필드 | contracts에 필드 하나 |
| 이벤트 로그 스키마 | 에이전트 착수 시 (그때 반드시) |

### 디렉터리 규약

```
~/.ade/
  config.yaml
  data.db
  workspaces/
  plugins/
  logs/
```

### 버저닝 4종

| 버전 | 대상 | 주의 |
|---|---|---|
| 앱 | ADE 릴리스 | SemVer |
| 프로토콜 | 서버↔클라 API | PWA 캐시 대응. 서버가 최소 2개 버전 동시 지원 |
| 스키마 | DB 마이그레이션 | 사용자가 버전 스킵 가능(v1→v5). 순차 보장 필요 |
| 플러그인 API | 익스텐션 호환 | 나중 |

**앱 버전이 오르면 나머지가 자동으로 오르는 게 아니다.** 각자 독립 증가하고 앱 버전이 조합을 가리킨다. 릴리스 시 조합 일관성 검증이 필요 — 이미지 태그는 v0.3.0인데 compose가 v0.2.0을 참조하는 실수가 여기서 나온다.

### 릴리스

```
git tag v0.3.0
  → 이미지 빌드·푸시
  → compose 파일 버전 갱신
  → GitHub Release + 릴리스 노트
```

CD가 아니라 **CI의 릴리스 잡**이다. 배포할 서버가 없으므로.

**Docker 경계 스모크 테스트** (컨테이너 내부는 이미지가 고정이라 매트릭스 테스트 불필요)
- 볼륨 마운트 권한 (호스트 UID/GID 불일치 — 가장 흔한 버그)
- 파일 watch가 bind mount에서 동작 (inotify)
- 재시작 후 데이터 유지

**Watchtower**는 dev compose 오버라이드로만. 서버 시작 시 마이그레이션 자동 실행이 전제.

### 터널링

**우리가 구현하지 않는다.** Tailscale 사용법을 문서로 안내. 직접 만들면 보안 책임만 진다.

**단, 서버에 필요한 것**: 인증(노출되는 순간 필수), HTTPS(PWA의 Service Worker·푸시가 요구), 기본 localhost 바인딩 + 외부 노출은 명시적 옵트인.

**알아둘 한계**: 폰 절전 시 연결 끊김(재연결 필수), PC가 꺼져 있으면 접근 불가, 푸시 알림은 외부 서비스 필요.

### 나중 (제품화)

install.sh, 첫 실행 마법사, `ade doctor`, `ade diagnostics`(시크릿 마스킹), 옵트인 텔레메트리, 마이그레이션 롤백, 라이트 테마.

전부 **새 파일 추가로 끝나므로** 지금 만들 이유가 없다.

### 판단 기준

> **나중에 넣을 때 기존 코드를 광범위하게 고쳐야 하면 지금, 새 파일 추가로 끝나면 나중.**

---

## 13. 에이전트 협업

### 계약 우선 리뷰

```
1. 인터페이스/타입만 제출
2. 검토 (10~30줄, 5분)
3. 승인 후 구현
4. 구현은 훑기만
```

계약이 승인되면 구현은 타입 체크와 계약 테스트가 검증한다. 500줄을 읽을 필요가 없다.

**에이전트가 이걸 자꾸 건너뛰고 구현까지 간다.** CONVENTIONS.md에 명시하고, 어기면 되돌린다.

이걸 가능하게 하는 게 **model 계층 분리**다. `model/`과 `viewmodel/I*.ts`에 순수 타입과 인터페이스만 있으면 그 diff만 보면 설계 변경을 전부 파악할 수 있다.

### 검토 강도 분리

| 정독 (전체의 10~15%) | 훑기 | 도구 위임 |
|---|---|---|
| `contracts/` | `model/` 구현 | 구조 → 린트 |
| `model/` 인터페이스 | `infra/` | 계약 → 테스트 |
| `viewmodel/I*.ts` | `viewmodel/` 구현 | UI → Storybook |
| `index.ts` | 테스트 | |
| 린트·tsconfig 설정 | | |

### 작업 단위

- **한 번에 하나의 슬라이스.** `model/` 먼저, 승인 후 `infra/`, 그 다음 `viewmodel/`
- **PR 400줄 이하** — 사람이 실제로 검토 가능한 한계
- **브랜치 = feature 슬라이스** — 여러 feature를 한 브랜치에서 건드리면 검토가 뒤섞인다

### 제출 시 요구사항

```markdown
## 변경 요약
계약 변경: ...
새 파일: ...
결정한 것: ...
확인 필요: ...        ← 여기만 봐도 되는 경우가 많음

## 체크리스트
- [ ] check(lint/typecheck/test) 통과
- [ ] model/에 React, fetch, window 없음
- [ ] features 간 직접 import 없음
- [ ] 새 공개 API가 index.ts에 반영
- [ ] 변경된 인터페이스에 TSDoc
- [ ] 결정을 벗어난 판단 명시
```

마지막 항목이 중요하다 — **에이전트가 임의로 판단한 지점을 스스로 신고**하게 하면 그 부분만 집중해서 보면 된다.

### 검토가 막힐 때

```
이 변경으로 기존 동작이 깨질 수 있는 지점을 나열해줘.
이 PR에서 내가 반드시 봐야 할 부분 3개만 짚어줘. 왜 그런지도.
계약 테스트로 검증되는 부분과 안 되는 부분을 구분해줘.
이걸 되돌리려면 뭘 지워야 해?
```

### 신뢰 구간

```
초기   모든 계약 정독, 구현도 훑기
중기   계약만 정독, 구현은 테스트 신뢰
후기   패턴이 확립된 영역은 스킵
```

같은 종류 작업에서 **3번 연속 무사고면 완화.** 문제가 나오면 **즉시 조이고, 그 문제를 린트 규칙이나 CONVENTIONS.md 항목으로 전환.**

### Git

- **Trunk-based + 짧은 브랜치**(1~2일). Git Flow 미사용 (웹 앱에 과함)
- `core/`·`contracts/` 변경은 **별도 브랜치로 먼저 머지**
- **Feature Flag 우선** — 미완성 기능은 장수 브랜치가 아니라 main에 머지하되 플래그로 끈다
- Conventional Commits
- 브랜치 수명을 짧게 — 에이전트는 빠르게 많이 만들어내므로 오래 두면 충돌 규모가 감당 불가

### 되돌리기 쉽게 유지

검토를 완벽히 할 수 없다는 전제로 설계한다. 짧은 브랜치, Feature Flag, 작은 커밋, Conventional Commits — 전부 이 목적.

### 핵심 원칙

> **검토 부담이 커지면 그건 구조 문제다.** 공개 표면이 넓어졌거나, feature 경계가 흐려졌거나, 계약 없이 구현부터 갔거나. 더 열심히 보는 게 아니라 구조를 조이거나 린트 규칙을 추가한다.

---

## 14. 도입 순서

### 3원칙

1. **강제 장치가 대상보다 먼저** — 린트 → features, 토큰 → 컴포넌트, Stylelint → CSS
2. **추상화는 사례 2~3개 뒤에** — Event Bus, Contribution Point, 서버 DI
3. **되돌리기 비싼 것을 먼저** — contracts, 이벤트 스키마, 의존 방향, 인증 자리

### Phase 0 — 리포 골격

workspace → tsconfig → contracts 첫 타입(URI, 에러 코드) → 린트 경계 규칙 → Vitest → **filesystem zod 스키마** → 서버 `/fs/read` → 클라 호출 확인

**완료 = 파일 하나 읽는 왕복이 타입으로 완결.** 여기가 되면 나머지 API는 같은 패턴의 반복.

### Phase 1 — 클라이언트 기반

core/types(Disposable, Emitter) → core/di → **디자인 토큰** → Stylelint → Radix+CSS Modules → shared/ui 최소 → Storybook → transport → 레이아웃 껍데기 + `useIsMobile()` → feature 경계 규칙 → 스캐폴딩

**토큰이 컴포넌트보다 먼저.** 컴포넌트를 먼저 만들면 색을 하드코딩하고 나중에 전부 고쳐야 한다.

### Phase 2 — 파일시스템

서버 계층 → Workspace·인증 자리 → 프로바이더 → SSE → 클라 model → **첫 계약 테스트** → MobX 도입 → VM 인터페이스(리뷰) → view → 에러 처리 정책 → docker-compose → CI 완성

**첫 계약 테스트를 잘 만들어두면 이후 에이전트가 그 패턴을 따른다.**

### Phase 3 — 에디터

라이브러리 결정(모바일 편집 때문에 **CodeMirror 6 유력**) → TextDocument → IEditorAdapter(리뷰) → 어댑터 구현 → EditorVM → 탭 스코프 → **테마 어댑터** → 저장·충돌 감지

### Phase 4 — 통합

**Command Registry → Context Key → 키바인딩 → 커맨드 팔레트** (함께 해야 효율적) → i18n 문자열 수집 → Event Bus 추출 → 레이아웃 재설계 → 밀도 모드 → MobileShell → 포커스 관리

Command Registry가 키보드·팔레트·모바일 진입점·i18n·에러 재시도·익스텐션 기여의 **결절점**이다. Context Key 없이 커맨드만 있으면 단축키가 충돌한다.

### Phase 5 — 에이전트

**이벤트 로그 스키마(리뷰, 가장 중요)** → 시퀀싱·재개 → runtime 계층 → 서버 DI + Session/Run 스코프 → 스트림·배칭 → IToolExecutor → LLM 어댑터 → HITL 승인

**스키마 설계에 시간을 충분히 쓸 것.** 여기서 틀리면 저장소·전송·클라이언트를 전부 되돌린다.

### Phase 6 — 제품화

릴리스 파이프라인 → Docker 스모크 → Watchtower(dev) → install.sh → doctor → 터널링 문서 → 라이트 테마 → 시각 회귀

### Phase 7 — 플러그인

**공개 API 안정화** → Contribution Point → app→workbench, features→extensions → 라이프사이클 → Extension Host → 테마 변수 공개

---

## 15. 리뷰 필수 지점

계약 우선 리뷰를 반드시 적용:

- contracts filesystem 스키마 (Phase 0)
- `IFileSystemProvider` (Phase 2)
- `IFileTreeVM` (Phase 2)
- `IEditorAdapter` (Phase 3)
- **이벤트 로그 스키마 (Phase 5)** — 가장 중요
- 공개 API 표면 (Phase 7)

나머지는 계약 테스트와 린트에 위임.

---

## 16. ADR 목록

| # | 제목 | 기각한 것 |
|---|---|---|
| 0001 | 모노레포 pnpm | Turborepo, Nx |
| 0002 | contracts 패키지 + zod | 각자 정의 후 수동 동기화 |
| 0003 | URI vs string path | string path (스킴 구분 불가) |
| 0004 | 프로토콜 버저닝 | 버전 없이 시작 |
| 0005 | MVVM + MobX | Zustand (타입/구현 한 덩어리) |
| 0006 | model/infra 분리 | Model에 I/O 포함 (추상·구체 혼재) |
| 0007 | 클라이언트 DI 자체 구현 | Inversify, Awilix |
| 0008 | Radix + CSS Modules | Tailwind, Primer 컴포넌트, MUI |
| 0009 | 디자인 토큰 2층 (Primer 값 복사) | 자체 팔레트 설계, npm 의존성 |
| 0010 | 로컬 전용 배포 | 클라우드 호스팅 |
| 0011 | SQLite | Postgres, Kafka |

각 4줄. **"왜 이렇게 안 했는가" 필수.**
