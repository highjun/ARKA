import { createRegistry, type DescriptorMatch, type Registry } from '#core';
import type { WorkbenchStartupDescriptor, IWorkbenchStartupRegistry } from './IWorkbenchStartup';

/** `IWorkbenchStartupRegistry`의 유일한 구현체 — core의 `createRegistry()`를 그대로 감싼다. */
export class WorkbenchStartupRegistry implements IWorkbenchStartupRegistry {
  readonly #registry: Registry<WorkbenchStartupDescriptor> = createRegistry();

  /** `#registry.add`에 위임한다. */
  add(descriptor: WorkbenchStartupDescriptor): void {
    this.#registry.add(descriptor);
  }

  /** `#registry.get`에 위임한다. */
  get(id: string): WorkbenchStartupDescriptor {
    return this.#registry.get(id);
  }

  /** `#registry.tryGet`에 위임한다. */
  tryGet(id: string): WorkbenchStartupDescriptor | undefined {
    return this.#registry.tryGet(id);
  }

  /** `#registry.list`에 위임한다. */
  list(): WorkbenchStartupDescriptor[] {
    return this.#registry.list();
  }

  /** `#registry.match`에 위임한다. */
  match(id: string): DescriptorMatch<WorkbenchStartupDescriptor>[] {
    return this.#registry.match(id);
  }
}
