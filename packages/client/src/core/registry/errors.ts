import { CoreError } from '#core/errors';

/**
 * Registry 가 세는 것은 **Descriptor** 다 — `todo.add` 처럼 사람이 적고 패턴 매칭까지 하는 문자열
 * ID 로 식별된다. DI 컨테이너의 토큰과는 다른 세계다:
 * 이쪽은 런타임에 늘어나는 목록이고, 저쪽은 조립 시점에 닫힌다.
 */
export class DescriptorNotFoundError extends CoreError {
  readonly id: string;
  /** `id`를 필드로도 남긴다 — 잡는 쪽이 메시지를 다시 파싱하지 않게. */
  constructor(id: string) {
    super(`No descriptor registered for id "${id}".`);
    this.id = id;
  }
}

/** `Registry.add()`가 이미 등록된 id로 다시 불렸을 때 — 덮어쓰기를 허용하지 않는다. */
export class DuplicateDescriptorError extends CoreError {
  readonly id: string;
  /** `id`를 필드로도 남긴다 — 잡는 쪽이 메시지를 다시 파싱하지 않게. */
  constructor(id: string) {
    super(`A descriptor is already registered for id "${id}".`);
    this.id = id;
  }
}
