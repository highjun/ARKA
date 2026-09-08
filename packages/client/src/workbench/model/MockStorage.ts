import type { IStorage } from './IStorage';

/** 메모리 안의 `IStorage`. 테스트와 스토리가 공유한다. */
export class MockStorage implements IStorage {
  readonly #map = new Map<string, string>();

  get(key: string): string | null {
    return this.#map.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.#map.set(key, value);
  }
}
