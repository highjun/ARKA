import { match as compileMatcher, type MatchFunction } from 'path-to-regexp';
import type { Descriptor, DescriptorMatch } from './descriptor';
import { DescriptorNotFoundError, DuplicateDescriptorError } from './errors';

/**
 * Registry 는 확장 지점별 descriptor 를 저장하고 조회한다. **실행하지 않는다** —
 * 실행은 descriptor 계약을 해석하는 쪽의 책임이다.
 */
export interface Registry<TDescriptor extends Descriptor> {
  /** descriptor 등록. 같은 ID 로 재등록 불가 */
  add(descriptor: TDescriptor): void;
  /** 조회. 없으면 에러 */
  get(id: string): TDescriptor;
  /** 조회 시도. 없으면 `undefined` */
  tryGet(id: string): TDescriptor | undefined;
  /** 등록된 전체 목록 반환 */
  list(): TDescriptor[];
  /** ID 패턴 조회. 파라미터와 함께 리스트로 반환 */
  match(id: string): DescriptorMatch<TDescriptor>[];
}

/**
 * `:param` 을 포함하지 않는 id 는 exact Map 조회로 끝나므로 matcher 를 만들지 않는다.
 * wildcard(`*name`)도 path-to-regexp 문법이라 함께 pattern 으로 취급한다.
 */
const isPatternId = (id: string) => id.includes(':') || id.includes('*');

class DescriptorRegistry<TDescriptor extends Descriptor> implements Registry<TDescriptor> {
  readonly #descriptors = new Map<string, TDescriptor>();
  readonly #matchers = new Map<string, MatchFunction<Partial<Record<string, string | string[]>>>>();

  add(descriptor: TDescriptor): void {
    if (this.#descriptors.has(descriptor.id)) throw new DuplicateDescriptorError(descriptor.id);
    this.#descriptors.set(descriptor.id, descriptor);
    // 잘못된 pattern 은 등록 시점에 터뜨린다 — 조회 시점까지 끌고 가지 않는다.
    if (isPatternId(descriptor.id)) this.#matchers.set(descriptor.id, compileMatcher(descriptor.id));
  }

  get(id: string): TDescriptor {
    const descriptor = this.#descriptors.get(id);
    if (!descriptor) throw new DescriptorNotFoundError(id);
    return descriptor;
  }

  tryGet(id: string): TDescriptor | undefined {
    return this.#descriptors.get(id);
  }

  list(): TDescriptor[] {
    return [...this.#descriptors.values()];
  }

  match(id: string): DescriptorMatch<TDescriptor>[] {
    const matches: DescriptorMatch<TDescriptor>[] = [];

    const exact = this.#descriptors.get(id);
    if (exact) matches.push({ descriptor: exact, params: {} });

    for (const [patternId, matcher] of this.#matchers) {
      // exact 로 이미 담았다
      if (patternId === id) continue;
      const result = matcher(id);
      if (!result) continue;

      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(result.params)) {
        if (typeof value === 'string') params[key] = value;
        else if (Array.isArray(value)) params[key] = value.join('/');
      }

      matches.push({ descriptor: this.#descriptors.get(patternId) as TDescriptor, params });
    }

    return matches;
  }
}

/** 빈 채로 시작한다. 등록 순서는 보존되지만 조회 순서를 보장하지는 않는다. */
export const createRegistry = <TDescriptor extends Descriptor>(): Registry<TDescriptor> =>
  new DescriptorRegistry<TDescriptor>();
