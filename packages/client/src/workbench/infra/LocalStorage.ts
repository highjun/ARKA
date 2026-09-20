import type { IStorage } from "../model/IStorage";

class LocalStorageAdapter implements IStorage {
  get(key: string): string | null {
    return localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
}

export const createStoragePort = (): IStorage => new LocalStorageAdapter();
