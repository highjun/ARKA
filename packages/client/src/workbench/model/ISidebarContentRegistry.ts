import { createToken } from '#core/di';
import type { ComponentType } from 'react';
import type { DescriptorMatch } from '#core';

/**
 * 활동 아이콘 바에서 고른 것에 대응하는 사이드바 내용. 없으면(`tryGet`이 `undefined`) 패널이 빈다.
 *
 * 옛 `shell/registries/index.ts`(타입 3개짜리 grouping 파일)에서 정식 Registry 역할로
 * 풀어냈다(2026-09-05, 5-C) — `IActivityBarRegistry`와 같은 이유로 갈렸다.
 */
export type SidebarContentDescriptor = {
  readonly id: string;
  readonly PanelComponent: ComponentType<{
    readonly onFileOpen: (path: string) => void;
    /** 파일이 옮겨졌다(드래그앤드롭 등) — 그 경로를 보던 탭이 새 경로를 따라가야 한다
     *  (`IShellViewModel.retargetTabs`). */
    readonly onFileMove: (oldPath: string, newPath: string) => void;
    /** 파일 행을 더블클릭했다 — 미리보기 탭을 고정한다(`IShellViewModel.pinTab`, Tab 헤더
     *  더블클릭과 같은 뜻). */
    readonly onFilePin: (path: string) => void;
    /** 파일이 아닌 탭을 연다(`IShellViewModel.openTab`) — 대화 세션 같은 것. */
    readonly onOpenTab: (tab: { readonly id: string; readonly kind: string; readonly title: string }) => void;
  }>;
};

export const SidebarContentRegistryToken = createToken<ISidebarContentRegistry>("sidebarContentRegistry");
/**
 * 2026-09-06 — Registry가 Model과 같은 파일 구성 엄격함을 받으면서 타입 별칭에서 인터페이스로
 * 바뀌었다. `core`의 `Registry<T>`와 구조가 같지만, 빈 `extends`는
 * `@typescript-eslint/no-empty-object-type`에 걸려 멤버를 그대로 옮겨 적는다.
 */
export interface ISidebarContentRegistry {
  /** descriptor 등록. 같은 ID로 재등록 불가. */
  add(descriptor: SidebarContentDescriptor): void;
  /** 조회. 없으면 에러. */
  get(id: string): SidebarContentDescriptor;
  /** 조회 시도. 없으면 `undefined`. */
  tryGet(id: string): SidebarContentDescriptor | undefined;
  /** 등록된 전체 목록 반환. */
  list(): SidebarContentDescriptor[];
  /** ID 패턴 조회. 파라미터와 함께 리스트로 반환. */
  match(id: string): DescriptorMatch<SidebarContentDescriptor>[];
}
