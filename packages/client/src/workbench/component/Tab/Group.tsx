import { createContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { Container } from "#component/Container";
import type { TabChrome, TabClassNames, TabId, TabRow } from "./shared";
import { ClassNamesContext, useTabClassNames } from "./TabContext";
import { StripRootImpl } from "./Strip";

/** `activeTabId`가 목록에 없으면 첫 탭으로 떨어진다 — 그 보정 결과가 여기 담긴다. */
export interface GroupState {
  readonly activeTabId: TabId | null;
  readonly selectedTab?: TabRow;
  readonly hasPanel: boolean;
}

/**
 * 한 칸 안의 탭 띠와 내용. 활성 탭은 밖에서 정한다 — 컴포넌트가 스스로 들지 않는다.
 * `onSelect`·`content`를 가로챈다 — 텍스트 선택 이벤트와 `content` 속성이 아니라 탭 고르기와 탭 내용이다.
 */
export interface TabGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect" | "content"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 그룹에 표시할 탭 목록. */
  readonly tabs: readonly TabRow[];
  /** 지금 선택된 탭의 id. 없으면 `null`. */
  readonly activeTabId: TabId | null;
  /** 좁은 화면인가. 지금은 `data-narrow`로만 실린다 — 띠 대신 "지금 탭 하나 + 목록에서 고르기"로 접는 표현은 아직이다. */
  readonly isNarrow?: boolean;
  /** 선택된 탭의 내용을 직접 준다 — 없으면 그 탭의 `Content`를 그린다. */
  readonly content?: ReactNode;
  /** 탭 헤더를 클릭하면 그 id와 함께 호출된다. */
  readonly onSelect?: (tabId: TabId) => void;
  /** 탭을 닫으면 그 id와 함께 호출된다. 없으면 닫기 버튼 자체가 안 뜬다. */
  readonly onClose?: (tabId: TabId) => void;
  /** 드래그로 순서를 바꾸면 새 id 순서와 함께 호출된다. 없으면 드래그 재정렬이 꺼진다. */
  readonly onReorder?: (nextTabIds: readonly TabId[]) => void;
  /** 미리보기 탭(`isPreview`)을 더블클릭하면 그 id와 함께 호출된다 — 없으면 아무 일도 없다(옵트인). */
  readonly onPin?: (tabId: TabId) => void;
  /** 주어지면 탭 헤더가 우클릭에 반응해 이 결과를 `Menu.Content`로 띄운다 — 없으면 아무 일도 없다(옵트인). */
  readonly renderTabMenu?: (tabId: TabId) => ReactNode;
  /** `tabs`가 빈 배열일 때 패널 자리에 보여줄 내용. 계약 밖이다. */
  readonly emptyMessage?: ReactNode;
  /** 프레임(테두리·radius·배경) 유무. 기본값 `'bordered'`. 계약 밖이다. */
  readonly chrome?: TabChrome;
}

/** `Tab.Split`이 leaf마다 안쪽 그룹에 넘기는 것 — 공개 props가 아니다. */
interface GroupImplExtras {
  readonly classNames?: TabClassNames;
  /** 패널 영역의 `aria-label`. */
  readonly panelLabel?: string;
  /** 선택된 탭의 내용을 id로 그린다 — 셸이 탭마다 컨테이너로 감쌀 때 쓴다. `content`보다 먼저다. */
  readonly renderContent?: (tabId: TabId) => ReactNode;
  /** 패널 위에 겹쳐 그릴 내용(드롭존 표시 등) — 레이아웃에 영향을 주지 않는다. */
  readonly panelOverlay?: ReactNode;
  /** 스트립 위에 겹쳐 그릴 내용(드롭존 표시 등) — 레이아웃에 영향을 주지 않는다. */
  readonly stripOverlay?: ReactNode;
}

/** 목록이 비면 `selectedTab`이 `undefined`다 — 부르는 쪽이 빈 상태를 그린다. */
const getGroupState = (tabs: readonly TabRow[], activeTabId: TabId | null): GroupState => {
  const selected = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return {
    activeTabId: selected?.id ?? activeTabId,
    selectedTab: selected,
    hasPanel: Boolean(selected),
  };
};

const GroupContext = createContext<GroupState | null>(null);

/** 실제 구현 — `data-component`를 스스로 찍지 않는다(공개 `Tab.Group`과 Split의 leaf 양쪽에서 재사용한다). */
export const GroupImpl = ({
  tabs,
  activeTabId,
  isNarrow,
  content,
  onSelect,
  onClose,
  onReorder,
  onPin,
  renderTabMenu,
  emptyMessage = "No selected tab",
  panelLabel = "Tab panel",
  renderContent,
  panelOverlay,
  stripOverlay,
  className,
  classNames: providedClassNames,
  ref,
  ...props
}: TabGroupProps & GroupImplExtras) => {
  const inherited = useTabClassNames();
  const classNames = providedClassNames ?? inherited;
  const state = getGroupState(tabs, activeTabId);
  const selected = state.selectedTab;

  return (
    <ClassNamesContext value={classNames}>
      <GroupContext value={state}>
        <div
          {...props}
          ref={ref as Ref<HTMLDivElement>}
          data-narrow={isNarrow ? "" : undefined}
          className={clsx(className, classNames.group)}
        >
          {/* 탭이 하나도 없으면 TabStrip 자체를 렌더하지 않는다 — 빈 상태는 `emptyMessage` 하나로만 말한다. */}
          {tabs.length > 0 ? (
            <StripRootImpl
              className={classNames.groupStrip}
              tabs={tabs}
              activeTabId={state.activeTabId}
              overlay={stripOverlay}
              onSelect={onSelect}
              onClose={onClose}
              onReorder={onReorder}
              onPin={onPin}
              renderTabMenu={renderTabMenu}
            />
          ) : null}
          <div className={classNames.groupPanelWrapper}>
            {selected ? (
              <Container chrome="none" className={classNames.groupPanel}>
                <div className={classNames.groupPanelContent} role="tabpanel" aria-label={panelLabel}>
                  {renderContent ? renderContent(selected.id) : (content ?? <selected.Content tabId={selected.id} />)}
                </div>
              </Container>
            ) : (
              <div className={classNames.groupPanelEmpty} role="tabpanel" aria-label={panelLabel}>
                {emptyMessage}
              </div>
            )}
            {panelOverlay}
          </div>
        </div>
      </GroupContext>
    </ClassNamesContext>
  );
};
GroupImpl.displayName = "Tab.Group";
