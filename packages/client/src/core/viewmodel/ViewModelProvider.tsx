import { createContext, useContext, type ReactNode } from "react";
import type { Container } from "#core/di";
import { CoreError } from "#core/errors";

/** `useAppContext`가 `ViewModelProvider` 트리 밖에서 불렸을 때. `CoreError` 계열이라 소비자가 다른 에러와 한 번에 구분해서 잡을 수 있다. */
class MissingViewModelProviderError extends CoreError {
  /** 인자가 없다 — 원인이 하나뿐이라 더 담을 것이 없다. */
  constructor() {
    super("useAppContext must be used within a ViewModelProvider.");
  }
}

const ContainerValue = createContext<Container | null>(null);

/**
 * DataBinding 이 `useViewModel` 로 ViewModel 을 얻으려면 컨테이너가 트리에 있어야 한다.
 * View 는 이 provider 를 직접 소비하지 않는다 — DataBinding 만 쓴다.
 */
export const ViewModelProvider = ({ container, children }: { container: Container; children: ReactNode }) => (
  <ContainerValue.Provider value={container}>{children}</ContainerValue.Provider>
);

/**
 * 컨테이너를 그대로 준다. 이름에 `AppContext` 가 남은 것은 이게 "앱 조립의 결과에 닿는
 * 통로" 라는 뜻이다.
 *
 * 보통은 이것 말고 `useViewModel` 을 쓴다 — 스코프를 만들거나 컨테이너 자체가 필요할 때만
 * 여기까지 내려온다.
 */
export const useAppContext = (): Container => {
  const container = useContext(ContainerValue);
  if (!container) throw new MissingViewModelProviderError();
  return container;
};
