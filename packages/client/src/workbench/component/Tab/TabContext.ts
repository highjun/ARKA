import { createContext, useContext } from "react";
import styles from "./Tab.module.css";
import type { TabClassNames } from "./shared";

/**
 * 클래스 전용 context. 공개 루트(`Tab.Strip`/`Tab.Group`/`Tab.Split`)에서 한 번만 주입하고 나머지
 * 부품은 여기서 읽는다 — 상태 context 와 섞지 않는다.
 */
export const ClassNamesContext = createContext<TabClassNames>({});

/** 부품이 자기 루트가 주입한 클래스 묶음을 읽는다. */
export const useTabClassNames = () => useContext(ClassNamesContext);

/**
 * 여기가 슬롯별 클래스를 한 번 정의해 넘긴다.
 *
 * `chrome`은 여기서 갈라 합성하지 않는다 — 변형은 `data-chrome`이 실어 CSS가 속성 선택자로
 * 받는다. 값이 DOM에 보이므로 어느 모양인지 개발자 도구에서 바로 읽힌다.
 * 나머지(orientation·divider·active·alwaysVisible)는 전부 상태로 고르는 `[data-*]` 슬롯이라
 * `Tab.module.css`의 속성 선택자가 그대로 처리한다.
 */
export const buildClassNames = (): TabClassNames => {
  return {
    header: styles["header"],
    // 미리보기 탭은 제목을 기울인다 — VSCode 와 같은 신호다(`[data-preview]`, Tab.module.css).
    headerLabel: styles["headerLabel"],
    headerActionSlot: styles["headerActionSlot"],
    headerCloseButtonHover: styles["headerCloseButtonHover"],
    /**
     * 글자 옆 아이콘을 1px 내린다.
     *
     * 아이콘은 줄상자에 기하적으로 중앙 정렬되지만, 눈은 글자를 **x-height 띠**로 읽는다.
     * `AGENTS.md` 처럼 디센더가 없는 문자열은 em 상자 아래가 비어서 글자 몸통이 아래로 밀리고,
     * 그만큼 아이콘이 떠 보인다(실측 1px). 아이콘 혼자 놓이는 자리(활동 바 등)에는 걸지 않는다 —
     * 거기서는 지금이 맞다.
     */
    headerIcon: styles["headerIcon"],
    headerCloseButtonPinned: styles["headerCloseButtonPinned"],
    headerContextMenuTrigger: styles["headerContextMenuTrigger"],

    stripRoot: styles["stripRoot"],
    stripListContainer: styles["stripListContainer"],
    stripList: styles["stripList"],
    stripItemWrapper: styles["stripItemWrapper"],
    stripIndicatorBefore: styles["stripIndicatorBefore"],
    stripIndicatorAfter: styles["stripIndicatorAfter"],
    stripDraggableHeader: styles["stripDraggableHeader"],
    stripDropOverlay: styles["stripDropOverlay"],
    stripScrollHandle: styles["stripScrollHandle"],

    group: styles["group"],
    groupStrip: styles["groupStrip"],
    groupPanelWrapper: styles["groupPanelWrapper"],
    // 패널은 여백을 두지 않는다 — 여백을 주면 안에 놓인 것이 영역을 채우지 못하고 카드처럼 뜬다.
    // 여백이 필요한 내용은 스스로 준다.
    groupPanel: styles["groupPanel"],
    groupPanelContent: styles["groupPanelContent"],
    groupPanelEmpty: styles["groupPanelEmpty"],
    panelDropIndicator: styles["panelDropIndicator"],

    splitRootHorizontal: styles["splitRootHorizontal"],
    splitRootVertical: styles["splitRootVertical"],
    splitBranchHorizontal: styles["splitBranchHorizontal"],
    splitBranchVertical: styles["splitBranchVertical"],
    splitBranchDividerHorizontal: styles["splitBranchDividerHorizontal"],
    splitBranchDividerVertical: styles["splitBranchDividerVertical"],
    leafSection: styles["leafSection"],
    leafSectionActive: styles["leafSectionActive"],
    leafGroup: styles["leafGroup"],
    rootLeafSection: styles["rootLeafSection"],
    rootLeafGroup: styles["rootLeafGroup"],
    resizeHandle: styles["resizeHandle"],
  };
};
