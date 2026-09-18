import type { ComponentType } from "react";

/**
 * 탭 하나의 내용 — `OpenTab.kind`로 찾는다.
 *
 * 옛 `shell/registries/index.ts`(타입 3개짜리 grouping 파일)에서 정식 Registry 역할로
 * 풀어냈다(2026-09-05, 5-C) — `IActivityBarRegistry`와 같은 이유로 갈렸다.
 */
/** 탭 안의 특정 위치를 보여 달라는 요청. 줄·열은 1부터, `seq`는 같은 위치를 다시 요청해도 구분되게. */
type TabReveal = { readonly line: number; readonly column: number; readonly seq: number };

/** `id`는 탭의 `kind`와 맞물린다 — 셸이 이 id로 무엇을 그릴지 찾는다. */
export type TabContentDescriptor = {
  readonly id: string;
  readonly iconId: string;
  /** `reveal`은 셸이 그 탭에 위치 요청이 있을 때만 준다 — 내용이 무시해도 된다(diff·대화 탭). */
  readonly TabComponent: ComponentType<{ readonly tabId: string; readonly reveal?: TabReveal | null }>;
};

declare module "#core/di" {
  /** `ITabContentRegistry`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.tabContentRegistry": ITabContentRegistry;
  }
}
/**
 * 2026-09-06 — Registry가 Model과 같은 파일 구성 엄격함을 받으면서 타입 별칭에서 인터페이스로
 * 바뀌었다. `core`의 `Registry<T>`와 구조가 같지만, 빈 `extends`는
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
  list(): readonly TabContentDescriptor[];
}
