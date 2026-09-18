import type { ComponentType } from "react";
import type { OpenTab } from "./ITabLayout";

/**
 * 활동 아이콘 바에서 고른 것에 대응하는 사이드바 내용. 없으면(`tryGet`이 `undefined`) 패널이 빈다.
 *
 * 옛 `shell/registries/index.ts`(타입 3개짜리 grouping 파일)에서 정식 Registry 역할로
 * 풀어냈다(2026-09-05, 5-C) — `IActivityBarRegistry`와 같은 이유로 갈렸다.
 */
/** 사이드바 본문·액션이 커널에게서 받는 것. 셋 다 `IShellViewModel`의 얇은 통로다. */
export type SidebarSlotProps = {
  /** 파일을 미리보기로 연다. `position`을 주면 그 줄·열(1부터)로 커서를 옮긴다(검색 결과). */
  readonly onFileOpen: (path: string, position?: { readonly line: number; readonly column: number }) => void;
  /** 파일이 옮겨졌다(드래그앤드롭 등) — 그 경로를 보던 탭이 새 경로를 따라가야 한다
   *  (`IShellViewModel.retargetTabs`). */
  readonly onFileMove: (oldPath: string, newPath: string) => void;
  /** 파일 행을 더블클릭했다 — 미리보기 탭을 고정한다(`IShellViewModel.pinTab`, Tab 헤더
   *  더블클릭과 같은 뜻). */
  readonly onFilePin: (path: string) => void;
  /** 파일이 아닌 탭을 연다(`IShellViewModel.openTab`) — 대화 세션 같은 것. */
  readonly onOpenTab: (tab: OpenTab) => void;
};

/**
 * 활동 아이콘 바에서 고른 것에 대응하는 사이드바 내용. 없으면(`tryGet`이 `undefined`) 패널이 빈다.
 *
 * **크롬은 커널이 그린다.** 확장은 액션만 내고 본문을 그린다 — 패널 머리를 직접 그리면 커널이
 * 이미 두른 패널 안에 패널이 하나 더 생긴다(2026-09-15까지 에이전트가 그랬다). 그래서 이름이
 * `PanelComponent`가 아니라 `ContentComponent`다.
 *
 * **제목은 여기 없다.** 활동 바 항목(`IActivityBarRegistry`)이 같은 `id`로 이미 들고 있어
 * 두 벌을 두면 갈린다 — VSCode도 사이드바 머리에 뷰 컨테이너 제목을 쓴다.
 *
 * 옛 `shell/registries/index.ts`(타입 3개짜리 grouping 파일)에서 정식 Registry 역할로
 * 풀어냈다(2026-09-05, 5-C) — `IActivityBarRegistry`와 같은 이유로 갈렸다.
 */
export type SidebarContentDescriptor = {
  readonly id: string;
  /** 머리 오른쪽에 그대로 놓이는 아이콘 버튼들 — 자주 쓰는 것 한둘이다. */
  readonly InlineActions?: ComponentType<SidebarSlotProps>;
  /** `'...'` 뒤에 접히는 메뉴 항목들. `Menu.Item` 모양을 낸다 — `Shell.panelActions`와 같은 관용구다. */
  readonly MenuActions?: ComponentType<SidebarSlotProps>;
  /** 패널 **본문**만 그린다. */
  readonly ContentComponent: ComponentType<SidebarSlotProps>;
};

declare module "#core/di" {
  /** `ISidebarContentRegistry`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.sidebarContentRegistry": ISidebarContentRegistry;
  }
}
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
  list(): readonly SidebarContentDescriptor[];
}
