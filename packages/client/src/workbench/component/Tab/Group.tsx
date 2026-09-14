import { createContext } from 'react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { clsx } from 'clsx';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Container } from '#component/Container';
import type { TabChrome, TabClassNames, TabGroupItem, TabId, TabItem } from './shared';
import { ClassNamesContext, useTabClassNames } from './TabContext';
import { StripRootImpl } from './Strip';

/** `activeTab`이 목록에 없으면 첫 탭으로 떨어진다 — 그 보정 결과가 여기 담긴다. */
export interface GroupState {
  readonly activeTab: TabId;
  readonly selectedTab?: TabGroupItem;
  readonly hasPanel: boolean;
}

/** `activeTab`의 유무로 controlled·uncontrolled가 갈린다. */
export interface TabGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 지금 선택된 탭의 id. 넘기면 controlled, 안 넘기면 `defaultActiveTab` 으로 컴포넌트가 자체 관리한다. */
  readonly activeTab?: TabId;
  /** uncontrolled 모드의 초깃값. */
  readonly defaultActiveTab?: TabId;
  /** 활성 탭이 바뀔 때마다 호출된다(controlled 여부와 무관, `onTabClick`과 별개). */
  readonly onActiveTabChange?: (tabId: TabId) => void;
  /** 그룹에 표시할 탭 목록. */
  readonly tabItems: readonly TabGroupItem[];
  /** 탭 헤더를 클릭하면 그 id와 함께 호출된다(controlled/uncontrolled 여부와 무관하게 항상 불린다). */
  readonly onTabClick: (tabId: TabId) => void;
  /** 스트립 끝의 "더 보기" 메뉴 버튼을 클릭하면 호출된다. */
  readonly onMenuClick: () => void;
  /** 탭을 닫으면 그 id와 함께 호출된다. 없으면 닫기 버튼 자체가 안 뜬다. */
  readonly onTabClose?: (tabId: TabId) => void;
  /** 드래그로 순서를 바꾸면 새 전체 목록과 함께 호출된다. 없으면 드래그 재정렬이 꺼진다. */
  readonly onTabReorder?: (nextItems: TabGroupItem[]) => void;
  /**
   * 미리보기 탭(`isPreview`)을 더블클릭하면 그 id와 함께 호출된다 — 없으면 더블클릭해도 아무
   * 일도 없다(옵트인). VSCode의 "미리보기 탭 더블클릭 시 고정" 관례. 이미 고정된 탭을 더블클릭
   * 하면 안 불린다.
   */
  readonly onTabPin?: (tabId: TabId) => void;
  /** `tabItems`가 빈 배열일 때 패널 자리에 보여줄 내용. */
  readonly emptyMessage?: ReactNode;
  /** `tabItems`가 빈 배열일 때 스트립 자리에 보여줄 내용. */
  readonly stripEmptyLabel?: ReactNode;
  /** 패널 영역의 `aria-label`. */
  readonly panelLabel?: string;
  /** 선택된 탭의 패널 내용을 직접 그린다 — 없으면 `item.content`를 그대로 쓴다. */
  readonly renderPanel?: (item: TabGroupItem) => ReactNode;
  /** 패널 위에 겹쳐 그릴 내용(드롭존 표시 등) — 레이아웃에 영향을 주지 않는다. */
  readonly panelOverlay?: ReactNode;
  /** 스트립 위에 겹쳐 그릴 내용(드롭존 표시 등) — 레이아웃에 영향을 주지 않는다. */
  readonly stripOverlay?: ReactNode;
  /** 주어지면 탭 헤더가 우클릭에 반응해 이 결과를 `Menu.Content`로 띄운다 — 없으면 지금처럼 아무 일도 없다(옵트인). */
  readonly renderTabContextMenu?: (tab: TabItem) => ReactNode;
  /** 프레임(테두리·radius·배경) 유무. 기본값 `'bordered'`. */
  readonly chrome?: TabChrome;
}

/** 목록이 비면 `selectedTab`이 `undefined`다 — 부르는 쪽이 빈 상태를 그린다. */
const getGroupState = (tabItems: readonly TabGroupItem[], activeTab: TabId): GroupState => {
  const selected = tabItems.find((tab) => tab.id === activeTab) ?? tabItems[0];

  return {
    activeTab: selected?.id ?? activeTab,
    selectedTab: selected,
    hasPanel: Boolean(selected),
  };
};

const GroupContext = createContext<GroupState | null>(null);

/** 실제 구현 — `data-component`를 스스로 찍지 않는다(공개 `Tab.Group`과 Split의 leaf 양쪽에서 재사용한다). */
export const GroupImpl = ({
  activeTab,
  defaultActiveTab = '',
  onActiveTabChange,
  tabItems,
  onTabClick,
  onMenuClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  emptyMessage = 'No selected tab',
  stripEmptyLabel,
  panelLabel = 'Tab panel',
  renderPanel,
  panelOverlay,
  stripOverlay,
  renderTabContextMenu,
  className,
  classNames: providedClassNames,
  ref,
  ...props
}: TabGroupProps & { readonly classNames?: TabClassNames } & { readonly ref?: Ref<HTMLElement> }) => {
  const inherited = useTabClassNames();
  const classNames = providedClassNames ?? inherited;
  const [currentActiveTab, setActiveTab] = useControllableState({ prop: activeTab, defaultProp: defaultActiveTab, onChange: onActiveTabChange, caller: 'Tab' });
  const state = getGroupState(tabItems, currentActiveTab);
  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    onTabClick(tabId);
  };

  return (
    <ClassNamesContext value={classNames}>
      <GroupContext value={state}>
        <div {...props} ref={ref as Ref<HTMLDivElement>} className={clsx(className, classNames.group)}>
          {/* 탭이 하나도 없으면 TabStrip 자체를 렌더하지 않는다 — `stripEmptyLabel`은 빈 슬롯의
              문구만 바꿀 뿐(테두리·배경·항상 뜨는 "..." 메뉴는 그대로 남아) Strip을 못
              숨긴다(2026-08-31, 실제로 그렇게 오해하고 쓰인 소비처가 있었다). 빈 상태는
              `emptyMessage` 하나로만 말한다. */}
          {tabItems.length > 0 ? (
            <StripRootImpl
              className={classNames.groupStrip}
              activeTab={state.activeTab}
              tabItems={tabItems}
              stripEmptyLabel={stripEmptyLabel}
              overlay={stripOverlay}
              onTabClick={handleTabClick}
              onMenuClick={onMenuClick}
              onTabClose={onTabClose}
              onTabReorder={onTabReorder}
              onTabPin={onTabPin}
              renderTabContextMenu={renderTabContextMenu}
            />
          ) : null}
          <div className={classNames.groupPanelWrapper}>
            {state.selectedTab ? (
              <Container chrome="none" className={classNames.groupPanel}>
                <div className={classNames.groupPanelContent} role="tabpanel" aria-label={panelLabel}>
                  {renderPanel ? renderPanel(state.selectedTab) : (state.selectedTab.content ?? null)}
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
GroupImpl.displayName = 'Tab.Group';
