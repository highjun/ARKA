import type { ReactNode } from "react";
import type { IconId } from "#component/Icon";

/**
 * 부품이 함께 쓰는 도메인 타입 — 탭 하나가 무엇인지, 드롭이 어디로 떨어지는지, 클래스 슬롯이
 * 무엇인지. 값이나 JSX를 담지 않는다.
 */

/** 프레임(테두리·radius·배경) 유무 — 패널을 꽉 채워서 쓸 땐 `none`. `Container`와 같은 축이다. */
export type TabChrome = "bordered" | "none";

/** 소비자가 정하는 불투명 문자열 — 이 컴포넌트는 비교만 한다. */
export type TabId = string;

/** 스트립이 그리는 데 필요한 최소 정보. 탭의 **내용물**은 여기 없다. */
export interface TabItem {
  readonly id: TabId;
  readonly title: string;
  readonly iconId: IconId;
  /** 있으면 `iconId` 대신 이걸로 렌더한다 — 파일 확장자별 아이콘(`FileIcon`)처럼 고정
   *  `IconId` 하나로 못 담는 아이콘이 필요한 소비처를 위한 탈출구. */
  readonly icon?: () => ReactNode;
  readonly isDirty?: boolean;
  /**
   * 미리보기 자리에 있는 탭 — 다음 파일을 열면 이 탭이 갈린다.
   *
   * VSCode 와 같이 제목을 기울여 알린다. `title` 을 `ReactNode` 로 넓히지 않고 플래그를 두는
   * 이유는, 그러면 말줄임·`aria-label`·드래그 라벨이 전부 임의의 노드를 다뤄야 하기 때문이다.
   */
  readonly isPreview?: boolean;
}

/** 내용까지 든 탭 — 그룹이 활성 탭 하나만 실제로 그린다. */
export interface TabGroupItem extends TabItem {
  readonly content?: ReactNode;
}

/** 자식이 늘어서는 방향이다 — 나누는 선의 방향이 아니다. */
export type TabSplitOrientation = "horizontal" | "vertical";
/** 스트립 안에서 대상 탭의 앞이냐 뒤냐. */
export type StripDropPosition = "before" | "after";
/** `center`는 나누지 않고 그 리프에 합친다는 뜻이다. */
export type SplitDropPosition = "left" | "right" | "top" | "bottom" | "center";
/** 실제로 새 분할을 만드는 넷. `center`가 빠진다. */
export type SplitEdgeDropPosition = Exclude<SplitDropPosition, "center">;
/** 스트립에 떨구면 순서 바꾸기, 패널에 떨구면 분할이다. */
export type TabDropZone = "strip" | "panel";

/**
 * 슬롯별 클래스 조립 계약.
 *
 * Tab 은 컴파운드가 3중첩(TabRoot → TabSplit → Branch → Leaf → TabGroup → TabStrip)이고 분기 렌더가 재귀라,
 * 슬롯을 props 로 내리면 모든 내부 컴포넌트 시그니처에 같은 인자가 붙는다. 그래서 클래스 전용
 * context 를 따로 두고 공개 루트에서 한 번만 주입한다 — 상태 context 와 섞지 않는다.
 */
export interface TabClassNames {
  readonly header?: string;
  readonly headerLabel?: string;
  /** 글자와 나란히 놓이는 아이콘의 광학 보정 자리. */
  readonly headerIcon?: string;
  readonly headerActionSlot?: string;
  /** 활성 탭의 닫기 버튼 — 항상 보이고 항상 눌린다. */
  readonly headerCloseButtonPinned?: string;
  /** 비활성 탭의 닫기 버튼 — `headerActionSlot`과 달리 폭을 차지하지 않고 `.header` 위에
   *  겹쳐 뜨지만, 이쪽도 항상 보이고 항상 눌린다. */
  readonly headerCloseButtonHover?: string;
  /** `Menu.Trigger`가 감쌀 때 씌운다 — `display: contents`로 자기 박스를 없애 안쪽 헤더의 flex 배치를 그대로 통과시킨다. */
  readonly headerContextMenuTrigger?: string;
  readonly stripRoot?: string;
  readonly stripListContainer?: string;
  readonly stripList?: string;
  readonly stripEmpty?: string;
  readonly stripTail?: string;
  readonly stripItemWrapper?: string;
  readonly stripIndicatorBefore?: string;
  readonly stripIndicatorAfter?: string;
  readonly stripDraggableHeader?: string;
  readonly stripDropOverlay?: string;
  readonly stripScrollHandle?: string;
  readonly group?: string;
  readonly groupStrip?: string;
  readonly groupPanelWrapper?: string;
  readonly groupPanel?: string;
  /** `role="tabpanel"` div 자신 — `renderPanel`이 돌려주는 임의 콘텐츠(예: `TextEditor`)가
   *  기댈 유일한 높이 확정 지점이다. */
  readonly groupPanelContent?: string;
  readonly groupPanelEmpty?: string;
  readonly panelDropIndicator?: string;
  readonly splitRootHorizontal?: string;
  readonly splitRootVertical?: string;
  readonly splitBranchHorizontal?: string;
  readonly splitBranchVertical?: string;
  readonly splitBranchDividerHorizontal?: string;
  readonly splitBranchDividerVertical?: string;
  readonly leafSection?: string;
  readonly leafSectionActive?: string;
  readonly leafGroup?: string;
  readonly rootLeafSection?: string;
  readonly rootLeafGroup?: string;
  readonly resizeHandle?: string;
}
