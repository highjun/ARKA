import { currentActivation, type Activation } from "./activation";

export interface CollectionEntry<T> {
  readonly item: T;
  readonly activation: Activation | undefined;
}

export class Collection<T> {
  readonly #entries: CollectionEntry<T>[] = [];

  add(item: T): void {
    this.#entries.push({ item, activation: currentActivation() });
  }

  list(): readonly T[] {
    return this.#entries.map((entry) => entry.item);
  }

  entries(): readonly CollectionEntry<T>[] {
    return [...this.#entries];
  }
}
