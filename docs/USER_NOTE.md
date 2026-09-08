# 사용자가 해야 할 일

에이전트가 할 수 없어 사용자 손이 필요한 것만 모은다. 끝낸 항목은 지운다.

- [ ] **VRT 산출물 소유권 복구** (2026-09-09) — Docker VRT가 root로 만든 디렉터리 때문에 `pnpm run vrt`가 쓰기 거부로 실패한다. 한 번만:
  ```
  sudo chown -R "$(id -u):$(id -g)" .output test/vrt/snapshots
  ```
  이후 실행은 `--user`로 돌아 다시 생기지 않는다.

---

## Server 구조
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

**ADR 형식**: 제목 / 결정 / 기각 / 상태

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

### 구현 3원칙

1. **강제 장치가 대상보다 먼저** — 린트 → features, 토큰 → 컴포넌트, Stylelint → CSS
2. **추상화는 사례 2~3개 뒤에** — Event Bus, Contribution Point, 서버 DI
3. **되돌리기 비싼 것을 먼저** — contracts, 이벤트 스키마, 의존 방향, 인증 자리


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
| 0002 | contracts 패키지 + zod | 각자 정의 후 수동 동기화 |
| 0004 | 프로토콜 버저닝 | 버전 없이 시작 |
| 0009 | 디자인 토큰 2층 (Primer 값 복사) | 자체 팔레트 설계, npm 의존성 |
| 0010 | 로컬 전용 배포 | 클라우드 호스팅 |
| 0011 | SQLite | Postgres, Kafka |

추가 ADR 후보:
1. ADR에 있는 결정 중 객관적인 내용은 린트로 강제한다. ADR 결정 중 단순 취향(실제 구현에 영향이 없는 부분)으로 수정해서 린트 규칙을 쉽게 적용할 수 있는 형태로 할 수 있다면, 그렇게 수정할 수 있다.
2.  contracts 패키지 + zod
3. 컴포넌트 작성 (CSS Modules 활용, Primer/Radix 활용)

컴포넌트는 controlled / uncontrolled **둘 다 지원**. 사용 시 기준은 폴더가 아니라 **상태의 성격**:

> **다른 누군가가 이 상태를 읽거나 바꿀 일이 있는가?**

- 없다 → uncontrolled로 **숨기는 게 낫다** (툴팁, 팝오버, 호버). ViewModel 인터페이스가 작을수록 리뷰가 쉽다
- 있다 → controlled, ViewModel이 소유 (Drawer, Dialog)

**추가 신호**: 커맨드로 노출될 만한 동작이면 무조건 controlled.

`useControllableState` 훅으로 통일하되, 상태를 가진 컴포넌트에만.

TMP
- client/test/{vrt,e2e}으로 client/ 안에서 전역적인 test 관련 로직을 하나의 폴더로 묶기
- .output/로 storybook-static 옮기기

- dist/는 아예 별개로 따로 두어야 할듯? 서버와 클라이언트랑 같이 가야 하는 거 아냐?
- index.html을 src/workbench 안으로 옮기는 건?

- Lint 규칙
    - Lint 커스텀 규칙은 fixtures를 관리해야 할 것
    - 현재 걸린 Lint 규칙 하나씩 리뷰
- Config 파일 관리: vite, vitestSetup, playwright config 확인

- Conventions.md를 간결하게 유지하기
- CI 파이프라인
    - 추가로, CI 되면 arka.sangjun.dev로 배포하기. 오키?

---

## 린트 2단계 — 코드를 고쳐야 켤 수 있는 것 (2026-09-08)

1단계 12개는 켰다(위반 0건, 전부 깨서 확인). 아래는 위반이 있어 못 켠 것.

- **DI 토큰은 자기 계약 파일에** — 위반 1건. `core/commands/tokens.ts`를 `ICommandCenterRegistry.ts`로 병합하면 예외 없는 규칙이 된다. `registerServices.tsx`의 비-export 로컬 토큰 5개는 조립 디테일이라 규칙 대상 밖.
- **`it()` 이름은 한글** — 위반 78건 / 20개 파일. `core/`(26)·`shared/components/`(13)에 편중.

## 린트 구멍 3개 — 실제로 뚫리는 것을 확인함

- **`React.useState()`가 안 잡힌다.** `viewOnlyUsesViewModel.ts:35`가 `callee.type !== "Identifier"`면 그냥 버려서, `useState()`는 잡히는데 `React.useState()`는 통과한다. 지금 그 형태가 0건이라 새는 건 없지만, 누가 그 스타일로 쓰면 규율이 조용히 무력화된다. → 기존 규칙에 `MemberExpression` 분기 추가
- **extension 쌍 zone이 수동 나열이다.** `no-restricted-paths`가 "형제끼리 금지"를 일반화 못 해 쌍마다 필요하다. 지금 `filesystem ↔ agent` 2개뿐이라 **`extensions/git/`을 만들어 `filesystem`을 import하면 0건으로 통과한다**(실제로 해봄). 셋이면 6쌍, 넷이면 12쌍. **셋 중 가장 급하다** — 다른 둘은 "누가 그렇게 쓰면"이지만 이건 extension을 추가하는 순간 자동으로 발생한다. → `arka/extensions-are-siblings` 커스텀 규칙이 경로에서 슬라이스 이름을 뽑아 비교
- **zone이 `packages/*/src/**`만 본다.** `e2e/`, `test/vrt/`, `tooling/`, `*.config.ts`가 대상 밖이다. E2E 스펙에서 `workbench/model/ThemeModel`을 직접 import해도 0건이다(실제로 해봄) — "밖에서 보이는 것만 검사한다"는 전제가 깨지는데 아무도 안 막는다. → zone의 `files` 글롭 확대

## 규칙을 쉽게 만들려고 고쳐야 할 문장 (아직 안 함)

실제 구현에 영향이 없고, 문장을 실측에 맞추면 판정이 가능해지는 것들. → `docs/lint-plan.md`

- **파일 이름 규칙** — "camelCase, React 컴포넌트만 PascalCase"인데 실측 위반 55건. 실제 관행은 "클래스 파일 PascalCase / 함수 모듈 camelCase / 계약 `I<Name>.ts`"다. **문장을 고치면 코드를 안 바꾸고 위반이 0이 된다.**
- **`describe`/`it`** — 한 문장이 두 규칙을 뭉뚱그린다. `it` 89% 한글 / `describe` 76% 영문으로 정반대인데, `describe`의 영문은 산문이 아니라 대상 식별자(`describe('listDirectory')`)다. ADR 0008도 "`describe`는 대상 단위로"라고 이미 적어놨다 — **문장 둘이 서로 어긋난다.** 가르면 `describe` 위반이 137→0.
- **`core/view-model/`** — 유일한 kebab-case 폴더. 형제는 `commands/`·`registry/`·`menu/`, 슬라이스 쪽은 `viewmodel/`. `core/viewmodel/`로 바꾸면 폴더명 규칙에 예외가 없어진다.

## 결정이 필요한 것

- **`PROTOCOL_VERSION`을 배선할지 지울지** (→ ADR 0015). 선언만 있고 쓰는 곳이 0건이다. 로컬에선 클라이언트·서버가 같이 빌드되어 문제가 안 되지만, 원격 배포(ADR 0014)로 폰에 PWA가 캐시되는 순간 실제가 된다. **배포 전에 정해야 한다.**
- **ADR 0013**(산출물·설정)은 한 번 지우셨던 문서를 다시 쓴 것이다. 불필요하면 지우고 CONVENTIONS에만 남긴다.

## 배포 전 반드시

- **Cloudflare Access 정책과 Tunnel 설정은 콘솔 작업이라 내가 못 한다.** 그게 유일한 인증 수단이다(→ ADR 0014).
- `curl https://arka.sangjun.dev/api/files`가 **인증 없이 200을 주면 안 된다.** 주면 워크스페이스 전체가 공개된 것이다.
