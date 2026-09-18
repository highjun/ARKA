import { Registry } from "#core/registry";
import type { ActivityBarDescriptor, IActivityBarRegistry } from "./IActivityBarRegistry";

/** `IActivityBarRegistry`의 유일한 구현체 — `core`의 `Registry`를 그대로 감싼다. */
export class ActivityBarRegistry implements IActivityBarRegistry {
  readonly #registry = new Registry<ActivityBarDescriptor>();

  /** `#registry.add`에 위임한다. */
  add(descriptor: ActivityBarDescriptor): void {
    this.#registry.add(descriptor);
  }

  /** `#registry.get`에 위임한다. */
  get(id: string): ActivityBarDescriptor {
    return this.#registry.get(id);
  }

  /** `#registry.tryGet`에 위임한다. */
  tryGet(id: string): ActivityBarDescriptor | undefined {
    return this.#registry.tryGet(id);
  }

  /** `#registry.list`에 위임한다. */
  list(): readonly ActivityBarDescriptor[] {
    return this.#registry.list();
  }
}
