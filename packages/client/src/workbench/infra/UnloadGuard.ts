import type { Disposable } from "#core/di";
import type { ITabSystem } from "../model/ITabSystem";

export const createUnloadGuard = ({ tabs }: { tabs: ITabSystem }): Disposable => {
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!tabs.hasAnyDirty()) return;
    event.preventDefault();
    event.returnValue = "";
  };
  window.addEventListener("beforeunload", onBeforeUnload);
  return { dispose: () => window.removeEventListener("beforeunload", onBeforeUnload) };
};
