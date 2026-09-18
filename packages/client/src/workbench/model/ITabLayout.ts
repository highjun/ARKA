import type { URI } from "#contracts";
import type { Disposable } from "#core/di";

/** 칸을 가르는 방향. `Tab` 컴포넌트의 것과 값이 같지만 Model은 컴포넌트를 모르므로 따로 선언한다. */
export type SplitOrientation = "horizontal" | "vertical";

/**
 * 열린 탭 하나. **직렬화 가능한 것만** 담는다 — 저장되고 새로고침 뒤 돌아온다.
 *
 * 파생 필드를 두지 않는다. `isActive`·`isPreview`는 `activeTabId`·`previewTabId` 포인터 하나면
 * "최대 하나"가 구조상 보장된다. 내용물 상태(파일 내용·더티)는 그 탭을 낸 쪽이 갖는다.
 */
export interface OpenTab {
  readonly id: string;
  /** 무엇이 이 탭을 그리는지. 복원할 때 같은 것을 다시 찾는 열쇠다. */
  readonly kind: string;
  /** 무엇을 열었나. 커널이 탭에 대해 아는 것은 이것과 더티 여부뿐이다. 저장은 `toString()`으로. */
  readonly uri: URI;
  readonly title: string;
}

/** 분할 트리의 잎을 가리키는 불투명 문자열. 탭 id와 다른 이름 공간이다. */
export type PaneId = string;

/** 탭이 실제로 놓이는 칸. */
export interface PaneLeaf {
  readonly kind: "leaf";
  readonly id: PaneId;
  readonly tabs: readonly OpenTab[];
  readonly activeTabId: string | null;
  /** 형제 사이의 비율. 없으면 균등. */
  readonly size?: number;
}

/** 칸을 둘 이상으로 가른 가지. 자기 탭은 없다. */
export interface PaneSplit {
  readonly kind: "split";
  readonly id: PaneId;
  readonly orientation: SplitOrientation;
  readonly children: readonly PaneNode[];
  readonly size?: number;
}

/** `kind`로 갈리는 판별 유니온. */
export type PaneNode = PaneLeaf | PaneSplit;

declare module "#core/di" {
  /** `ITabLayout`을 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.tabLayout": ITabLayout;
  }
}
/**
 * 무엇이 열려 있나. 지금은 localStorage에 산다 — 서버 저장은 나중 라운드.
 *
 * setter는 "다음 값이 뭐여야 하는지"를 계산하지 않는다. 그 판단은 ViewModel에 있다.
 */
export interface ITabLayout {
  readonly tree: PaneNode;
  setTree(tree: PaneNode): void;
  /** 지금 조작 대상인 칸. 분할이 여러 개여도 하나다. */
  readonly activePaneId: PaneId;
  setActivePaneId(id: PaneId): void;
  /** 미리보기 자리에 있는 탭. **전역 하나다** — 다음 파일을 열면 이 탭이 갈린다. */
  readonly previewTabId: string | null;
  setPreviewTabId(id: string | null): void;
  onDidChange(listener: () => void): Disposable;
}
