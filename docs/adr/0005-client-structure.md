# ADR 0005: 클라이언트 구조

## 결정

### 파일트리

```
client/src
├─ core/         # 조립과 중개를 맡는 커널 — DI, 이벤트, 레지스트리, 커맨드
├─ workbench/    # 기능이 꽂히는 자리와 그 운영 — 사이드바·패널·탭, 레이아웃, 조립
│   ├─ main.tsx            # 진입점 — 부트만 한다
│   ├─ Workbench.tsx       # 전역 배선(키다운·beforeunload·테마)을 걸고 셸을 띄운다
│   ├─ registerServices.tsx # 조립 — 무엇이 꽂히는지는 이 파일만 안다
│   └─ *.css               # 전역 스타일. 앱에 한 번 적용되는 부수효과라 shared가 아니다
├─ extensions/   # 자리를 채우는 도메인 기능 — 파일·Git·에이전트별로 나눈다
└─ shared/       # 어디서나 쓰는 범용 조각 — UI 프리미티브, 순수 유틸
```

의존은 이 방향으로만 흐른다.

```
workbench → extensions
workbench → core
extensions → core
누구나    → shared
```

- `extensions`는 `workbench`를 import하지 않는다 — **오늘 0건이고, 이 0을 지키는 것이 전환 조건이다**
- `extensions`끼리 직접 import하지 않는다. DI 토큰이나 이벤트로만 소통한다
- **`workbench → extensions`는 조립부에서만.** workbench의 `model/`·`viewmodel/`·`view/`는 특정 extension을 알지 않는다
- `shared`는 아무것도 import하지 않는다. 공통 추출은 아래로만 한다

마이크로커널의 전단계로서 위와 같이 의존성을 관리한다.

### Layered Architecture

`workbench/`와 `extensions/*/` 는 모두 아래의 5계층으로 정리된다.

```
workbench/  ·  extensions/<name>/
├─ component/    # props만 받아 그리는 프레젠테이션 조각
├─ view/         # ViewModel에 바인딩해 화면을 구성한다
├─ viewmodel/    # 화면 상태와 프레젠테이션 로직
├─ model/        # 도메인 형태와 비즈니스 로직
└─ infra/        # model이 선언한 인터페이스의 I/O 구현
```

```
Component ← View ↔ ViewModel → Model ← Infra

model     ──이벤트──→ viewmodel
viewmodel ──바인딩──→ view
```

- **`View ↔ ViewModel`은 바인딩이지 참조가 아니다.** ViewModel은 자기가 화면에 붙었는지 모른다.
- **model은 사실과 사건을, viewmodel은 화면 상태를 다룬다.** 값은 getter로 내고, 런타임에 변하는 model만 변경 이벤트를 낸다 — 조립 시점에 정해지는 model에는 알릴 사건이 없다
- `model`이 선언하는 인터페이스는 자기 것이 아니라 **`infra`가 구현할 것**이다. 이 구분이 흐려지면 `infra/`를 나눈 이유가 사라진다
- `component/`는 그 도메인 전용이다. 도메인을 모르는 조각은 `shared/components/`
- **DI 토큰은 자기 계약 파일에 둔다** — `model/IThemeModel.ts`가 `IThemeModel`과 `ThemeModelToken`을 함께 내보낸다. 슬라이스 루트에 `tokens.ts`를 두지 않는다
- 계층별 금지 — `component/`는 ViewModel·Model·DI를, `view/`는 `useViewModel` 외 훅을, `viewmodel/`은 DOM 조작과 도메인 판단을, `model/`은 React·fetch·window·전역 상태를, `infra/`는 React를 쓰지 않는다
- 빈 레이어를 미리 만들지 않는다


## 기각:
- **`app/`을 따로 두기** — workbench가 곧 자리 제공자이자 조립자다. 나누면 "이건 app이야 workbench야"를 매번 묻게 된다.
- **`shared/`를 `workbench/` 안으로** — workbench가 *자리*와 *누구나 쓰는 프리미티브* 두 가지를 겸하게 된다.
- **`shared/`를 `core/`로** — core의 정의("UI도 모름")를 고쳐야 한다.
- **`features/` 유지** — `shell`은 도메인을 모르니 workbench, `filesystem`은 파일을 아니 extension이다. 한 이름으로 부르면 **둘 사이에 방향이 있다는 것 자체가 안 보인다.** extensions끼리는 서로 못 부르는데 workbench↔extension은 한쪽만 열려 있고, 그 비대칭이 사라진다.
- **지금 동적 로딩으로 가기** — 익스텐션이 쓸 API가 매주 바뀌면 아무것도 못 만든다.
- **`model/`에 atom 두기** — atom이 View까지 새어나가 View가 Model을 직접 구독하게 되고, ViewModel 계층이 무의미해진다. arka-workbench에서 실제로 그랬다.
- **폴더를 미리 다 만들어 두기** — 통과 함수만 있는 계층을 만든다.
- **슬라이스 루트의 `tokens.ts`** — 서비스를 하나 추가할 때 파일 셋(계약·구현·토큰)을 건드리게 되고, 그 파일이 슬라이스의 모든 계약을 import하는 역방향 허브가 된다. VSCode도 `createDecorator`를 인터페이스 바로 앞에 둔다.
- **`core`·`shared`를 별도 패키지로 쪼개기** — [ADR 0001](0001-monorepo-pnpm.md)의 "두 번째 클라이언트가 생길 때까지 보류"가 유효하다.

## 상태:
승인됨.