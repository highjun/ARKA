import { createRegistry, type DescriptorMatch, type Registry } from '#core';
import type { SidebarContentDescriptor, ISidebarContentRegistry } from './ISidebarContentRegistry';

/** `ISidebarContentRegistry`의 유일한 구현체 — `@arka/core`의 `createRegistry()`를 그대로 감싼다. */
export class SidebarContentRegistry implements ISidebarContentRegistry {
  readonly #registry: Registry<SidebarContentDescriptor> = createRegistry();

  /** `#registry.add`에 위임한다. */
  add(descriptor: SidebarContentDescriptor): void {
    this.#registry.add(descriptor);
  }

  /** `#registry.get`에 위임한다. */
  get(id: string): SidebarContentDescriptor {
    return this.#registry.get(id);
  }

  /** `#registry.tryGet`에 위임한다. */
  tryGet(id: string): SidebarContentDescriptor | undefined {
    return this.#registry.tryGet(id);
  }

  /** `#registry.list`에 위임한다. */
  list(): SidebarContentDescriptor[] {
    return this.#registry.list();
  }

  /** `#registry.match`에 위임한다. */
  match(id: string): DescriptorMatch<SidebarContentDescriptor>[] {
    return this.#registry.match(id);
  }
}
