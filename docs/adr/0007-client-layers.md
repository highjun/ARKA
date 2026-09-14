# ADR 0007: 슬라이스 안에서 레이어가 갈리고 의존은 안쪽을 향한다

## 맥락:
이 결정을 담던 문서는 2026-09-12 아카이브와 함께 지워졌고, 그것을 보던 린트 규칙 넷도 주인이 없어
껐다. 코드는 여전히 이 모양이라 **문서 없이 강제 없이 유지되는 구조**가 됐다. 컴포넌트를 정비하려면
`component/`가 무엇을 모르는지가 먼저 정해져 있어야 한다.

## 결정:
- **슬라이스 안은 `model/ infra/ viewmodel/ view/ component/`다.** 의존은 안쪽(`model/`)을 향한다.
- **`component/`는 props만 받아 그린다** — ViewModel·Model·DI를 런타임으로 모른다. 그래서 스토리 하나로 모든 상태를 그릴 수 있다.
- **`view/`가 부르는 훅은 `useViewModel` 하나다.** 로컬 상태가 필요하면 ViewModel로 올리고, DI 접근(`useAppContext`·`resolve`)도 하지 않는다.
- **`model/`은 React와 상태 라이브러리를 런타임으로 모른다.** 도메인 타입·순수 로직과 `infra/`가 구현할 인터페이스 선언까지다. `import type`은 컴파일에서 지워지므로 결합이 아니다.
- **어느 구현이 꽂힐지는 조립부가 정한다** — client는 `workbench/registerServices.tsx`.
- **슬라이스끼리 직접 import하지 않는다.** DI 토큰이나 이벤트로만 소통한다.
- **도메인을 모르는 조각은 `shared/`로, 그중 자기 DOM을 안 그리는 것은 `shared/utils/`로 간다** — Provider·ErrorBoundary가 그것이다. `shared/`는 아무것도 import하지 않는다.

## 기각:
- **레이어를 최상위로 두기**(`components/` `hooks/` `services/`) — 기능 하나를 고칠 때 다섯 폴더를 오간다. 슬라이스가 먼저다.
- **`view/`가 DI를 직접 보기** — 그러면 view마다 조립 지식이 흩어져 화면 하나를 테스트할 때 컨테이너를 세워야 한다.
- **`component/`가 ViewModel을 prop으로 받기** — 얇아 보이지만 컴포넌트가 도메인을 알게 되어 재사용과 스토리가 동시에 막힌다.
- **`model/`에 nanostores atom을 두기** — 화면 상태와 사실이 한 자리에 섞인다. atom은 ViewModel이 소유한다.

## 대가:
- **ViewModel이 두꺼워진다.** view가 훅을 못 쓰니 사소한 토글 하나도 ViewModel의 공개 면이 된다 — `IShellViewModel`이 46멤버다.
- 슬라이스가 서로를 모르니 **둘이 같은 것을 쓰려면 먼저 위로 올려야 한다**. 올릴 자리를 고르는 판단이 매번 든다.

## 강제:
- **린트** `import-x/no-restricted-paths` — 슬라이스끼리의 import를 막는다(zone에 슬라이스를 열거한다).
- **린트** `@typescript-eslint/no-restricted-imports` — `model/`의 상태 라이브러리·React를 막는다. `import type`은 허용한다 — 컴파일에서 지워져 결합이 아니다.
- **린트** `no-restricted-syntax` — `view/`에서 `useViewModel` 아닌 훅과 DI 접근을 막는다.
- **리뷰** — "이 조각이 도메인을 모르는가"와 "이것을 위로 올릴 자리가 맞는가"는 사람만 판정한다.

## 상태:
승인됨 (2026-09-14, 사후 기록). 2026-09-12에 지워진 결정을 강제와 함께 되세운 것이다.
