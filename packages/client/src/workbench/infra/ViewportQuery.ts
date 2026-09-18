import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IViewport } from "../model/IViewport";

/** 좁은 화면의 경계 — `Shell.module.css`가 사이드바를 드로어로 바꾸는 폭과 같다. */
const NARROW_QUERY = "(max-width: 767px)";

/** `matchMedia`로 `IViewport`를 만든다. 리스너는 처음 구독할 때 걸고, 마지막 구독이 풀려도 남긴다 — 앱에 하나다. */
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
