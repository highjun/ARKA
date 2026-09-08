import type { ComponentType } from 'react';
import type { DescriptorMatch } from '#core';

/**
 * 탭 하나의 내용 — `OpenTab.kind`로 찾는다.
 *
 * 옛 `shell/registries/index.ts`(타입 3개짜리 grouping 파일)에서 정식 Registry 역할로
 * 풀어냈다(2026-09-05, 5-C) — `IActivityBarRegistry`와 같은 이유로 갈렸다.
 */
export type TabContentDescriptor = {
  readonly id: string;
  readonly iconId: string;
  readonly TabComponent: ComponentType<{ readonly tabId: string }>;
};

/**
 * 2026-09-06 — Registry가 Model과 같은 파일 구성 엄격함을 받으면서 타입 별칭에서 인터페이스로
 * 바뀌었다. `@arka/core`의 `Registry<T>`와 구조가 같지만, 빈 `extends`는
 * `@typescript-eslint/no-empty-object-type`에 걸려 멤버를 그대로 옮겨 적는다.
 */
export interface ITabContentRegistry {
  /** descriptor 등록. 같은 ID로 재등록 불가. */
  add(descriptor: TabContentDescriptor): void;
  /** 조회. 없으면 에러. */
  get(id: string): TabContentDescriptor;
  /** 조회 시도. 없으면 `undefined`. */
  tryGet(id: string): TabContentDescriptor | undefined;
  /** 등록된 전체 목록 반환. */
  list(): TabContentDescriptor[];
  /** ID 패턴 조회. 파라미터와 함께 리스트로 반환. */
  match(id: string): DescriptorMatch<TabContentDescriptor>[];
}
