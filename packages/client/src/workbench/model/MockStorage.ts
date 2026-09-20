import type { IStorage } from "./IStorage";

export class MockStorage implements IStorage {
  readonly #map = new Map<string, string>();

  get(key: string): string | null {
    return this.#map.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.#map.set(key, value);
  }
}
