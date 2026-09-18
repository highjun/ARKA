import type { Container, Disposable } from "#core/di";
import type { PaneId, SplitOrientation } from "../model/ITabLayout";
import type { TabDescriptor } from "../model/ITabProviderDescriptor";

/** 새 분할을 만드는 넷. 합치기(`center`)는 여기 없다. */
export type SplitEdge = "left" | "right" | "top" | "bottom";

/** 탭 우클릭 메뉴(`menuId: 'shell.tab.context'`) 명령이 받는 대상 — 어느 칸의 어느 탭인지. */
export interface TabContextTarget {
  readonly paneId: PaneId;
  readonly tabId: string;
}

/**
 * 화면이 그릴 탭 한 줄. 그리는 데 필요한 전부를 싣는다 — View는 레지스트리도 `ITabSystem`도 모른다.
 * `icon`·`Content`는 provider가 돌려준 `TabDescriptor`에서 온다 — VM은 들고 있지 않고 통과시킬 뿐이다.
 */
export interface TabRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly icon: TabDescriptor["icon"];
  readonly Content: TabDescriptor["Content"];
  /** 미리보기 자리에 있다. 화면은 기울임으로 알린다. */
  readonly isPreview: boolean;
  readonly isDirty: boolean;
}

/** 화면이 그릴 칸 하나. Model의 `PaneLeaf`와 구조가 같고 탭이 `TabRow`다. */
export interface PaneRowLeaf {
  readonly kind: "leaf";
  readonly id: PaneId;
  readonly tabs: readonly TabRow[];
  readonly activeTabId: string | null;
  readonly size?: number;
}

/** `PaneRowLeaf`와 짝을 이루는 가지. */
interface PaneRowSplit {
  readonly kind: "split";
  readonly id: PaneId;
  readonly orientation: SplitOrientation;
  readonly children: readonly PaneRowNode[];
  readonly size?: number;
}

/** `kind`로 갈리는 판별 유니온. */
export type PaneRowNode = PaneRowLeaf | PaneRowSplit;

declare module "#core/di" {
  /** `ITabSystemViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.tabSystemViewModel": ITabSystemViewModel;
  }
}
/**
 * 탭과 분할. 조작의 판단이 전부 여기 있다 — Model은 값만 든다. 여는 것은 여기 없다 — 명령이 `ITabSystem.open`을 부른다.
 *
 * 관찰 property는 전부 값 그대로다. 구현은 MobX observable 클래스고, 화면은 `observer`로 감싸 따라온다.
 */
export interface ITabSystemViewModel extends Disposable {
  readonly tree: PaneRowNode;
  /** 지금 포커스된 칸. 분할이 여러 개여도 "지금 조작 대상"은 하나뿐이다. */
  readonly activePaneId: PaneId;
  /** 익스텐션 명령("지금 파일의 미리보기")이 읽는다. */
  readonly activeTab: { readonly id: string; readonly kind: string } | null;

  selectTab(paneId: PaneId, tabId: string): void;
  /** 확인 없이 바로 닫는다. `requestCloseTab`이 더티가 아닐 때 부르는 것 — 계약 밖이다. */
  closeTab(paneId: PaneId, tabId: string): void;
  /** 더티면 확인을 구한다(`pendingClose`). 아니면 바로 닫는다. */
  requestCloseTab(paneId: PaneId, tabId: string): void;
  readonly pendingClose: { readonly paneId: PaneId; readonly tabId: string } | null;
  confirmClose(): void;
  cancelClose(): void;
  /** 더티인 탭은 조용히 남긴다 — 확인창을 여러 개 띄우지 않는다. */
  closeOthers(paneId: PaneId, tabId: string): void;
  closeToRight(paneId: PaneId, tabId: string): void;

  /** 드래그로 재정렬한 결과 — 순서만 바뀐 id 목록이다. */
  reorderTabs(paneId: PaneId, nextTabIds: readonly string[]): void;
  /** 가장자리로 떼어내 새 칸을 만든다. 합치기는 여기 없다. */
  splitTab(paneId: PaneId, tabId: string, edge: SplitEdge): void;
  resizePane(branchId: PaneId, childId: PaneId, nextSize: number): void;

  /** 미리보기 탭을 고정한다. 이미 고정돼 있으면 아무 일도 없다. */
  pinTab(tabId: string): void;
  /** 파일이 옮겨졌다 — `oldPrefix`로 시작하는 `file:` 탭이 `newPrefix`를 따라간다. */
  retargetTabs(oldPrefix: string, newPrefix: string): void;

  /**
   * 그 탭의 자식 컨테이너 — View가 탭 본문을 `ContainerProvider`로 감쌀 때 쓴다. 계약 밖이다(W14).
   * @throws DescriptorNotFoundError 그 id의 탭이 없다.
   */
  containerOf(tabId: string): Container;
}
