import { Registry } from "#core/registry";
import type { TabContentDescriptor, ITabContentRegistry } from "./ITabContentRegistry";

/** `ITabContentRegistry`의 유일한 구현체 — `core`의 `Registry`를 그대로 감싼다. */
export class TabContentRegistry implements ITabContentRegistry {
  readonly #registry = new Registry<TabContentDescriptor>();

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
  list(): readonly TabContentDescriptor[] {
    return this.#registry.list();
  }
}
