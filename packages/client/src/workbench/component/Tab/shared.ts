import type { ReactNode } from "react";
import type { SplitOrientation } from "../../row/tabRows";

export type { SplitEdge, SplitOrientation } from "../../row/tabRows";

export type TabId = string;

/** 칸 트리 마디의 id. 칸과 가지가 한 이름 공간을 쓴다 — 가지도 크기 조절 대상이라서다. */
export type GroupId = string;

/** 띠 안에서 끌고 있는 탭이 어느 탭의 앞/뒤에 들어갈지. */
export type StripDropPosition = "before" | "after";

/**
 * 탭 하나 — `Tab.Item`이 그리는 것.
 *
 * 본문을 들고 다니지 않는다 — 내용을 만드는 길은 `renderContent` 하나다.
 * `icon`은 `IconId`로 못 줄인다 — 확장이 자기 아이콘을 공급한다(`<FileIcon fileName/>`).
 */
export interface TabItem {
  readonly id: TabId;
  readonly title: string;
  readonly icon: ReactNode;
  /** 미리보기(기울임) 탭인지. 기본은 아니다. */
  readonly isPreview?: boolean;
  /** 저장하지 않은 변경이 있는지. `data-dirty`로 싣는다. 기본은 없다. */
  readonly isDirty?: boolean;
}

/** 칸 하나 — `Tab.Group`이 그리는 것. 트리의 잎이다. */
export interface TabGroup {
  readonly kind: "group";
  readonly id: GroupId;
  readonly items: readonly TabItem[];
  /** 이 칸의 활성 탭. 칸마다 하나씩이라 prop이 아니라 트리 안에 산다. */
  readonly activeItemId: TabId | null;
  /** 형제 사이의 비율(%). 생략하면 남은 자리를 고르게 나눠 갖는다. */
  readonly size?: number;
}

/** 칸을 가로·세로로 나눈 가지 — `Tab.Split`이 그리는 것. */
export interface TabSplit {
  readonly kind: "split";
  readonly id: GroupId;
  readonly orientation: SplitOrientation;
  readonly children: readonly TabTree[];
  readonly size?: number;
}

export type TabTree = TabGroup | TabSplit;

/**
 * 활성 탭을 고른다 — 주어진 id가 목록에 없으면 첫 탭으로 되돌린다.
 * 탭이 닫혀 id가 사라져도 띠가 빈 채로 남지 않게 하는 자리다.
 */
export const resolveActiveItem = (items: readonly TabItem[], activeItemId: TabId | null): TabItem | undefined =>
  items.find((item) => item.id === activeItemId) ?? items[0];
