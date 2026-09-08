import type { Disposable } from '#core/di';

/**
 * `@arka/ui`의 `TabSplitOrientation`과 값이 같다 — 그대로 import 하지 않는 것은 Model이 기반
 * 스택(`#core`) 밖의 외부 라이브러리를 직접 알면 안 되기
 * 때문이다(`MODEL-13`). 값만 맞춰 독자적으로 선언한다 — 구조적 타이핑이라 `@arka/ui`의 `Tab`에
 * 그대로 흘려 넣어도 별도 변환이 필요 없다.
 */
export type TabSplitOrientation = 'horizontal' | 'vertical';

/**
 * 열린 탭 하나. **직렬화 가능한 것만 담는다** — `ReactNode`를 담는 순간 이 계약이 React를 알게
 * 되고, 지속(localStorage)에 담을 수 없는 것이 생긴다.
 *
 * `kind`는 `string`이다 — 무엇을 그릴지는 `ITabContentRegistry`가 안다.
 *
 * `isActive`·`isPreview`는 여기 없다 — 활성/미리보기는 "최대 하나"라는 유일성이 `activeTabId`·
 * `previewTabId` 포인터 하나면 타입 구조상 저절로 보장되는데, 필드로 흩으면 그 보장이 사라지고
 * 검증 로직을 새로 만들어야 한다.
 *
 * 탭 안의 실제 내용물 상태(파일 내용·`isDirty` 등)도 여기 없다 — 그 탭을 등록한 모듈이 스스로
 * 갖는다(`filesystem`의 `IFileContentModel`이 하듯이). Shell은 "무엇이 열려 있고 어느 게
 * 활성·미리보기인지"라는 뼈대만 안다.
 *
 * `@arka/ui`의 `TabGroupItem`을 그대로 쓰지 않는 것도 같은 이유다 — 그 타입은 `content`
 * (`ReactNode`)·`isDirty`·`isPreview`처럼 여기서 일부러 갖지 않기로 한 파생 필드를 갖고 있다.
 */
export type OpenTab = {
  /** 파일은 **워크스페이스 루트 기준 경로**다. */
  readonly id: string;
  readonly kind: string;
  readonly title: string;
};

export type PaneId = string;

/**
 * 탭 트리 한 조각 — leaf(탭 묶음 하나)이거나 split(자식을 나눈 가지)이다. `@arka/ui`의 `Tab`이
 * 받는 `TabTreeNode`와 재귀 구조가 같다(그 컴포넌트의 계약이 이 모양을 요구하니 별도 변환
 * 계층을 둘 이유가 없다) — `orientation`도 `TabSplitOrientation`을 그대로 가져다 쓴다. 다만
 * leaf의 탭 목록은 `TabGroupItem[]`이 아니라 `OpenTab[]`이다(위 `OpenTab` 주석 참고 — Model은
 * React 노드나 파생 필드를 갖지 않는다). `size`는 `@arka/ui`의 리사이즈가 쓰는 비율값을 그대로
 * 지속한다.
 */
export interface TabPaneLeaf {
  readonly kind: 'leaf';
  readonly id: PaneId;
  readonly tabs: readonly OpenTab[];
  readonly activeTabId: string | null;
  readonly size?: number;
}
/** `TabPaneLeaf`와 짝을 이루는 분할 노드. */
export interface TabPaneSplit {
  readonly kind: 'split';
  readonly id: PaneId;
  readonly orientation: TabSplitOrientation;
  readonly children: readonly TabPaneNode[];
  readonly size?: number;
}
export type TabPaneNode = TabPaneLeaf | TabPaneSplit;

/**
 * 탭 트리와 그중 활성 leaf·미리보기가 무엇인지, 그 값 셋만 갖는다.
 *
 * setter 셋 다 "다음 값이 뭐여야 하는지"는 계산하지 않는다 — 호출하는 쪽(`IShellViewModel`)이 이미
 * 계산해서 넘겨준 값을 그대로 반영하고, 지속(`IStorage`)시킬 뿐이다. 분할·닫기·리사이즈 같은
 * 판단은 여기 없다.
 */
export interface ITabsModel {
  readonly tree: TabPaneNode;
  setTree(tree: TabPaneNode): void;

  /** 지금 포커스된 pane(leaf). Split이 여러 개여도 "지금 조작 대상"은 하나뿐이다. */
  readonly activeLeafId: PaneId;
  setActiveLeafId(id: PaneId): void;

  /** 지금 미리보기 자리에 있는 탭. 없으면 `null`. 전역 하나다 — pane마다 따로 두면 "미리보기
   * 자리 하나" 정책이 어느 pane 기준인지 모호해진다. */
  readonly previewTabId: string | null;
  setPreviewTabId(id: string | null): void;

  /** 상태가 바뀔 때마다 부른다. */
  onDidChange(listener: () => void): Disposable;

}
