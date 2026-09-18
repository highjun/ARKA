import { CoreError } from "#core/errors";

/** `Registry.get`이 없는 id를 받았다. */
export class DescriptorNotFoundError extends CoreError {
  readonly id: string;
  /** `id`를 필드로도 남긴다 — 잡는 쪽이 메시지를 다시 파싱하지 않게. */
  constructor(id: string) {
    super(`No descriptor registered for id "${id}".`);
    this.id = id;
  }
}

/** `Registry.add`가 이미 있는 id를 받았다. 조용한 덮어쓰기가 더 나쁘다. */
export class DescriptorDuplicatedIdError extends CoreError {
  readonly id: string;
  /** `id`를 필드로도 남긴다 — 잡는 쪽이 메시지를 다시 파싱하지 않게. */
  constructor(id: string) {
    super(`A descriptor is already registered for id "${id}".`);
    this.id = id;
  }
}
