declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.storage": IStorage;
  }
}
export interface IStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}
