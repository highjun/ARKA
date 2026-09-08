import { createRegistry, type DescriptorMatch, type Registry } from '#core';
import type { TabContentDescriptor, ITabContentRegistry } from './ITabContentRegistry';

/** `ITabContentRegistry`의 유일한 구현체 — `@arka/core`의 `createRegistry()`를 그대로 감싼다. */
export class TabContentRegistry implements ITabContentRegistry {
  readonly #registry: Registry<TabContentDescriptor> = createRegistry();

  /** `#registry.add`에 위임한다. */
  add(descriptor: TabContentDescriptor): void {
    this.#registry.add(descriptor);
  }

  /** `#registry.get`에 위임한다. */
  get(id: string): TabContentDescriptor {
    return this.#registry.get(id);
  }

  /** `#registry.tryGet`에 위임한다. */
  tryGet(id: string): TabContentDescriptor | undefined {
    return this.#registry.tryGet(id);
  }

  /** `#registry.list`에 위임한다. */
  list(): TabContentDescriptor[] {
    return this.#registry.list();
  }

  /** `#registry.match`에 위임한다. */
  match(id: string): DescriptorMatch<TabContentDescriptor>[] {
    return this.#registry.match(id);
  }
}
