import { createRegistry, type DescriptorMatch, type Registry } from '#core';
import type { ActivityBarDescriptor, IActivityBarRegistry } from './IActivityBarRegistry';

/** `IActivityBarRegistry`의 유일한 구현체 — `core`의 `createRegistry()`를 그대로 감싼다. */
export class ActivityBarRegistry implements IActivityBarRegistry {
  readonly #registry: Registry<ActivityBarDescriptor> = createRegistry();

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
  list(): ActivityBarDescriptor[] {
    return this.#registry.list();
  }

  /** `#registry.match`에 위임한다. */
  match(id: string): DescriptorMatch<ActivityBarDescriptor>[] {
    return this.#registry.match(id);
  }
}
