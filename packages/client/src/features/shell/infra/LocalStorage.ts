import type { IStorage } from '../model/IStorage';

class LocalStorageAdapter implements IStorage {
  get(key: string): string | null {
    return localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
}

/** `IStorage`의 실제 구현(`LocalStorageAdapter`)을 만든다. */
export const createStoragePort = (): IStorage => new LocalStorageAdapter();
