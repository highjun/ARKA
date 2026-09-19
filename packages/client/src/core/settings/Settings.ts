import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import { Registry } from "#core/registry";
import type { ISettings, SettingsDescriptor, SettingsStore } from "./ISettings";

/** 저장된 값이 스키마가 말하는 타입인가. 아니면 기본값으로 돌아간다 — 깨진 저장소가 앱을 못 세운다. */
const conforms = (descriptor: SettingsDescriptor, value: unknown): boolean => {
  switch (descriptor.type) {
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number";
    case "string":
      return typeof value === "string";
    case "enum":
      return typeof value === "string" && descriptor.options.includes(value);
  }
};

/** `ISettings`의 유일한 구현체. 저장소는 포트로 받는다 — core는 localStorage를 모른다. */
export class Settings implements ISettings {
  readonly schema = new Registry<SettingsDescriptor>();
  readonly #store: SettingsStore;
  readonly #changed = new Emitter<string>();
  #values: Record<string, unknown>;

  /** 생성 시점에 저장된 값을 읽어 둔다 — 부팅 뒤 따로 부를 것이 없다. */
  constructor({ store }: { store: SettingsStore }) {
    this.#store = store;
    this.#values = { ...store.load() };
  }

  /**
   * 저장된 값이 타입에 맞으면 그것, 아니면 `default`.
   * @throws DescriptorNotFoundError 등록 안 된 id다.
   */
  get<T>(id: string): T {
    const descriptor = this.schema.get(id);
    const stored = this.#values[id];
    return (conforms(descriptor, stored) ? stored : descriptor.default) as T;
  }

  /**
   * 저장하고 `onDidChange`에 그 id를 알린다.
   * @throws DescriptorNotFoundError 등록 안 된 id다.
   */
  set(id: string, value: unknown): void {
    this.schema.get(id);
    this.#values = { ...this.#values, [id]: value };
    this.#store.save(this.#values);
    this.#changed.fire(id);
  }

  /** 어느 id가 바뀌었는지 준다 — 받는 쪽이 자기 것만 다시 읽는다. */
  onDidChange(listener: (id: string) => void): Disposable {
    return this.#changed.event(listener);
  }
}
