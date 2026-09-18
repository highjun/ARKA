import { createContext, type ReactNode } from "react";
import type { Container } from "#core/di";
import { CoreError } from "#core/errors";

/** `useViewModel`이 `ContainerProvider` 트리 밖에서 불렸다. 원인이 하나뿐이라 인자가 없다. */
export class MissingContainerProviderError extends CoreError {
  /** 인자가 없다 — 원인이 하나뿐이라 더 담을 것이 없다. */
  constructor() {
    super("useViewModel must be used within a ContainerProvider.");
  }
}

/** 트리에 실린 컨테이너. 배럴 밖 — `useViewModel`만 읽는다. */
export const ContainerContext = createContext<Container | null>(null);

/**
 * 컨테이너를 React 트리에 싣는다. **실어 나르는 것은 ViewModel이 아니라 컨테이너다.**
 *
 * 루트에 한 번, 탭마다 한 번 더 겹친다 — 안쪽이 바깥을 가리므로 그 아래 `useViewModel`은
 * 그 탭의 컨테이너에서 꺼낸다. **컨테이너를 만들지도 죽이지도 않는다** — 받아서 내려 줄 뿐이다.
 */
export const ContainerProvider = ({ container, children }: { container: Container; children: ReactNode }) => (
  <ContainerContext value={container}>{children}</ContainerContext>
);
