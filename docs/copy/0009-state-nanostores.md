# ADR 0009: 상태 라이브러리는 nanostores

## 결정:
- ViewModel의 화면 상태는 **nanostores의 atom**으로 들고, `ViewModelBase.observe()`가 그것을 구독 대상에 편입시킨다.
- **atom은 ViewModel만 소유한다.** `model/`은 값 getter와 변경 이벤트만 내고 atom을 모른다(→ [ADR 0005](0005-client-structure.md)).
- **atom은 React 경계를 넘지 않는다.** `useViewModel`이 `subscribe`/`getVersion` 둘만 `useSyncExternalStore`에 넘기므로, View는 값만 받고 무엇으로 구현했는지 모른다.

## 기각:
- **MobX** — ADE 아키텍처 문서 §4가 지정했으나 뒤집는다. `observer` HOC를 빼먹으면 조용히 리렌더되지 않는 실패가 생기는데, `useSyncExternalStore` 방식엔 그 실패 자체가 없다. 그리고 `makeAutoObservable`이 인스턴스 전체를 observable로 만들어 "누가 이 상태를 소유하는가"를 오히려 흐린다. MobX를 고른 이유였던 "인터페이스/구현 분리로 계약 우선 리뷰"는 `I<Name>ViewModel.ts` 계약 파일이 이미 달성한다.
- Zustand — 스토어가 타입과 구현을 한 덩어리로 들고 있어 계약만 따로 리뷰할 수 없다.
- Redux — action/reducer 의례가 이 규모에 과하고, 전역 스토어라 ViewModel별 스코프와 어긋난다.
- 상태 라이브러리 없이 `useState` — 상태가 컴포넌트로 새어 ViewModel 계층이 무의미해진다.

## 상태:
승인됨. ADE 문서 §4를 대체한다. `model/`이 상태 라이브러리를 import하지 못하는 것은 `arka/model-is-state-library-free`가 강제한다.
