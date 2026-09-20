import type { Descriptor } from "./descriptor";
import { DescriptorDuplicatedIdError, DescriptorNotFoundError } from "./errors";

export class Registry<TDescriptor extends Descriptor> {
  readonly #descriptors = new Map<string, TDescriptor>();

  add(descriptor: TDescriptor): void {
    if (this.#descriptors.has(descriptor.id)) throw new DescriptorDuplicatedIdError(descriptor.id);
    this.#descriptors.set(descriptor.id, descriptor);
  }

  get(id: string): TDescriptor {
    const descriptor = this.#descriptors.get(id);
    if (descriptor === undefined) throw new DescriptorNotFoundError(id);
    return descriptor;
  }

  tryGet(id: string): TDescriptor | undefined {
    return this.#descriptors.get(id);
  }

  list(): readonly TDescriptor[] {
    return [...this.#descriptors.values()];
  }
}
