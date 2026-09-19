import type { Descriptor } from "./descriptor";
import { DescriptorDuplicatedIdError, DescriptorNotFoundError } from "./errors";

/**
 * 확장이 꽂히는 자리. 담고 찾는 일만 한다 — 실행은 descriptor를 해석하는 쪽의 일이다.
 *
 * 레지스트리 자체가 `InstanceMap`에 올라 있어 확장이 꺼내서 직접 `add`한다.
 * **`add`는 `activate` 안에서만 부른다** — 부팅 뒤로 안 변하므로 등록 취소가 없다.
 */
export class Registry<TDescriptor extends Descriptor> {
  readonly #descriptors = new Map<string, TDescriptor>();

  /**
   * 담는다.
   * @throws DescriptorDuplicatedIdError 같은 id가 이미 있다.
   */
  add(descriptor: TDescriptor): void {
    if (this.#descriptors.has(descriptor.id)) throw new DescriptorDuplicatedIdError(descriptor.id);
    this.#descriptors.set(descriptor.id, descriptor);
  }

  /**
   * id로 찾는다.
   * @throws DescriptorNotFoundError 그 id가 없다.
   */
  get(id: string): TDescriptor {
    const descriptor = this.#descriptors.get(id);
    if (descriptor === undefined) throw new DescriptorNotFoundError(id);
    return descriptor;
  }

  /** 없으면 `undefined`. */
  tryGet(id: string): TDescriptor | undefined {
    return this.#descriptors.get(id);
  }

  /** 등록 순서 그대로. */
  list(): readonly TDescriptor[] {
    return [...this.#descriptors.values()];
  }
}
