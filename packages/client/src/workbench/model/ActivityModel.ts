import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { ActivityId, IActivityModel } from "./IActivityModel";

/** `IActivityModel`의 유일한 구현체 — 상태를 필드 하나로 유지하고 변화는 이벤트로 알린다. */
export class ActivityModel implements IActivityModel {
  /** 탐색기로 시작한다 — 지금 활동은 이것 하나뿐이다. */
  #activeActivityId: ActivityId | null = "explorer";

  /** `#activeActivityId`를 그대로 노출한다. */
  get activeActivityId() {
    return this.#activeActivityId;
  }

  /** `#activeActivityId`에 값을 반영한다. */
  setActiveActivityId(id: ActivityId | null): void {
    this.#setActiveActivityId(id);
  }

  readonly #changed = new Emitter();

  #setActiveActivityId(next: ActivityId | null): void {
    if (this.#activeActivityId === next) return;
    this.#activeActivityId = next;
    this.#changed.fire();
  }

  /** 상태가 바뀔 때마다 부른다. ViewModel이 이걸 받아 자기 atom을 갱신한다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
