import type { IStorage } from './IStorage';

/** 메모리 안의 `IStorage`. 테스트와 스토리가 공유한다. */
export class MockStorage implements IStorage {
  readonly #map = new Map<string, string>();

  /** 없으면 `null` — `localStorage`와 같은 약속이다. */
  get(key: string): string | null {
    return this.#map.get(key) ?? null;
  }

  /** 용량 제한이 없다 — 실제 저장소가 던지는 `QuotaExceededError`를 흉내내지 않는다. */
  set(key: string, value: string): void {
    this.#map.set(key, value);
  }
}
