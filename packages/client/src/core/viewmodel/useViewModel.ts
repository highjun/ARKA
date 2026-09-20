import { useContext } from "react";
import type { InstanceId, InstanceMap } from "#core/di";
import { ContainerContext, MissingContainerProviderError } from "./ContainerProvider";

export function useViewModel<K extends InstanceId>(id: K): InstanceMap[K] {
  const container = useContext(ContainerContext);
  if (container === null) throw new MissingContainerProviderError();
  return container.resolve(id);
}
