import { useContext } from "react";
import type { InstanceId, InstanceMap } from "#core/di";
import { ContainerContext, MissingContainerProviderError } from "./ContainerProvider";

/**
 * ViewModel을 꺼낸다. `view/`가 부를 수 있는 유일한 훅이다.
 *
 * 값을 감싸지도 구독을 중계하지도 않는다 — **인스턴스를 그대로 돌려준다.** 값이 바뀔 때 다시 그리는
 * 것은 `observer(...)`의 몫이고, 정리는 컨테이너가 죽을 때 컨테이너가 한다.
 *
 * 훅이 받는 것은 `InstanceId` 전부라 타입이 서비스를 막아 주지 않는다 — 이건 린트가 지킨다.
 * @throws MissingContainerProviderError `ContainerProvider` 밖에서 불렸다.
 */
export function useViewModel<K extends InstanceId>(id: K): InstanceMap[K] {
  const container = useContext(ContainerContext);
  if (container === null) throw new MissingContainerProviderError();
  return container.resolve(id);
}
