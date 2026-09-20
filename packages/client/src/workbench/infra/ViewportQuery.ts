import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IViewport } from "../model/IViewport";

const NARROW_QUERY = "(max-width: 767px)";

export const createViewportQuery = (): IViewport => {
  const query = window.matchMedia(NARROW_QUERY);
  const changed = new Emitter();
  query.addEventListener("change", () => changed.fire());
  return {
    get isNarrow() {
      return query.matches;
    },
    onDidChange: (listener): Disposable => changed.event(listener),
  };
};
