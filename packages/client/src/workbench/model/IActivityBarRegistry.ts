import { createToken } from '#core/di';
import type { DescriptorMatch } from '#core';

/** 활동 아이콘 바 항목 하나 — 어떤 아이콘이 있고, 눌렀을 때 부를 라벨이 뭔가. */
export type ActivityBarDescriptor = {
  readonly id: string;
  readonly title: string;
  readonly iconId: string;
};

export const ActivityBarRegistryToken = createToken<IActivityBarRegistry>("activityBarRegistry");
/**
 * Shell이 갖는 확장 지점의 계약. `FilesystemModule` 등 각 모듈이 `registerServices.tsx`를 통해 여기
 * 등록하고, Shell은 등록된 것을 그릴 뿐 어떤 모듈이 무엇을 등록했는지 모른다.
 *
 * `ISidebarContentRegistry`와 1:1로 묶지 않는다 — 예전 `conversation` 활동은 아이콘 바엔 있었지만
 * 사이드바 패널은 없었다(탭을 여는 버튼만 있었다). 합쳤다면 이 모양을 표현하지 못했다. `id`로만
 * 서로 연결된다(문자열 관례) — 컴파일 타임 보장은 없다.
 *
 * 2026-09-06 — Registry가 Model과 같은 파일 구성 엄격함을 받으면서(계약+구현+테스트) 타입
 * 별칭에서 인터페이스로 바뀌었다. `core`의 `Registry<T>`와 구조가 같지만, 빈 `extends`는
 * `@typescript-eslint/no-empty-object-type`에 걸려 멤버를 그대로 옮겨 적는다.
 */
export interface IActivityBarRegistry {
  /** descriptor 등록. 같은 ID로 재등록 불가. */
  add(descriptor: ActivityBarDescriptor): void;
  /** 조회. 없으면 에러. */
  get(id: string): ActivityBarDescriptor;
  /** 조회 시도. 없으면 `undefined`. */
  tryGet(id: string): ActivityBarDescriptor | undefined;
  /** 등록된 전체 목록 반환. */
  list(): ActivityBarDescriptor[];
  /** ID 패턴 조회. 파라미터와 함께 리스트로 반환. */
  match(id: string): DescriptorMatch<ActivityBarDescriptor>[];
}
