/**
 * legacy 그대로 1:1 포팅한다(드래그 재정렬 + 분할 뷰 + 리사이즈 핸들 포함) — 다른 컴포넌트 대비
 * 압도적으로 크지만(legacy 3233줄) 축소하지 않기로 결정했다.
 *
 * 한때는 구현을 `headless/`(관심사별로 나뉜 폴더 — context/header/strip/group/split)로 따로 뒀다 —
 * 컴파운드가 3중첩(Root → Split → Branch → Leaf → Group → Strip)이고 분기 렌더가 재귀라, 다른 5개
 * 컴포넌트처럼 구현까지 파일 하나로 접으면 오히려 읽기 어렵다는 이유였다. 지금은 컴포넌트 폴더에
 * 서브디렉터리를 금지하는 화이트리스트(`tooling/lint/treelint/component.ts`) 때문에 그 구조를
 * 유지할 수 없다 — 상태 로직(훅)은 `useTabStrip.ts`/`useTabSplit.ts`로 뽑고, JSX 렌더링(Header·
 * Strip·Group·Split과 그 조립 전부)은 이 파일 하나로 합쳤다. 파일이 커지는 건 감수한다.
 */
import { createContext, forwardRef, useContext, useRef } from 'react';
import type {
  CSSProperties,
  Dispatch,
  DragEventHandler,
  FocusEventHandler,
  HTMLAttributes,
  KeyboardEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  MutableRefObject,
  PointerEventHandler,
  ReactNode,
  Ref,
  RefCallback,
  SetStateAction,
} from 'react';
import { assembleCompound } from '#utils/assembleCompound';
import { mergeClassNames } from '#utils/mergeClassNames';
import { useControlledState } from '#utils/useControlledState';
import styles from './Tab.module.css';
import { getStripItemStates, useStripScrollHandle, useTabStrip } from './useTabStrip';
import { getRootLeafState, useSplitBranch, useTabSplit } from './useTabSplit';
import { Container } from '#components/layout/Container';
import { Icon } from '#components/common/Icon';
import type { IconId } from '#components/common/Icon';
import { IconButton } from '#components/common/IconButton';
import { ContextMenu } from '#components/common/ContextMenu';

// ─── 공통 도메인 ───

export type TabId = string;

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

export interface TabGroupItem extends TabItem {
  readonly content?: ReactNode;
}

export type TabSplitOrientation = 'horizontal' | 'vertical';
export type StripDropPosition = 'before' | 'after';
export type SplitDropPosition = 'left' | 'right' | 'top' | 'bottom' | 'center';
export type SplitEdgeDropPosition = Exclude<SplitDropPosition, 'center'>;
export type TabDropZone = 'strip' | 'panel';

/**
 * 슬롯별 클래스 조립 계약.
 *
 * Tab 은 컴파운드가 3중첩(Root → Split → Branch → Leaf → Group → Strip)이고 분기 렌더가 재귀라,
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
  /** `ContextMenu.Trigger`가 감쌀 때 씌운다 — `display: contents`로 자기 박스를 없애 안쪽 헤더의 flex 배치를 그대로 통과시킨다. */
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

/**
 * 클래스 전용 context. 공개 루트(`Strip`/`Group`/`Split`)에서 한 번만 주입하고 나머지는 여기서
 * 읽는다 — 상태 context 와 섞지 않는다.
 */
const ClassNamesContext = createContext<TabClassNames>({});
const useTabClassNames = () => useContext(ClassNamesContext);

// ─── Header ───

export interface HeaderState {
  readonly active: boolean;
  readonly dirty: boolean;
}

export interface TabHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** 이 탭이 지금 선택된(보이는) 탭인가. */
  readonly isActive?: boolean;
  /** 저장 안 된 변경이 있는가 — 제목 옆에 점으로 표시된다. */
  readonly isDirty?: boolean;
  /**
   * 미리보기 자리에 있는 탭 — 다음 파일을 열면 이 탭이 갈린다.
   *
   * VSCode 와 같이 제목을 기울여 알린다. `title` 을 `ReactNode` 로 넓히지 않고 플래그를 두는
   * 이유는, 그러면 말줄임·`aria-label`·드래그 라벨이 전부 임의의 노드를 다뤄야 하기 때문이다.
   */
  readonly isPreview?: boolean;
  /** 닫기 버튼을 클릭하면 호출된다. */
  readonly onClose: () => void;
  /** 탭 아이콘. */
  readonly iconId: IconId;
  /** 있으면 `iconId` 대신 이걸로 렌더한다. */
  readonly icon?: () => ReactNode;
  /** 탭 제목. */
  readonly title: string;
}

export const getHeaderState = (isActive: boolean, isDirty: boolean): HeaderState => ({
  active: Boolean(isActive),
  dirty: Boolean(isDirty),
});

/** 닫기 버튼 클릭 — 헤더 자신의 클릭(탭 활성화)으로 안 번지게 막고 나서 닫는다. */
const handleHeaderCloseClick = (onClose: () => void) => (event: { stopPropagation: () => void }) => {
  event.stopPropagation();
  onClose();
};

/** 닫기 버튼 자체는 드래그 대상이 아니다 — 부모 헤더의 드래그 제스처로 안 번지게 막는다. */
const preventDragStart = (event: { preventDefault: () => void }) => event.preventDefault();

/** 탭 하나의 제목 줄 — 아이콘·제목·닫기 버튼을 담는다. `Tab.Group`/`Tab.Strip`이 내부에서 쓴다. */
const Header = ({
  isActive = false,
  isDirty = false,
  isPreview = false,
  onClose,
  iconId,
  icon,
  title,
  className,
  ...props
}: TabHeaderProps) => {
  const classNames = useTabClassNames();

  return (
    <div
      {...props}
      role={props.role ?? 'tab'}
      aria-selected={props['aria-selected'] ?? isActive}
      data-active={isActive ? '' : undefined}
      data-dirty={isDirty ? '' : undefined}
      data-component="Tab.Header"
      className={mergeClassNames(className, classNames.header)}
    >
      {icon ? (
        <span className={classNames.headerIcon}>{icon()}</span>
      ) : (
        <Icon iconId={iconId} size="sm" className={classNames.headerIcon} />
      )}
      <span data-preview={isPreview ? '' : undefined} className={classNames.headerLabel}>
        {title}
      </span>
      {/*
       * `isActive`일 때만 `headerActionSlot`(레이아웃 폭을 차지하는 자리)을 마운트한다 —
       * 비활성 탭은 그 자리만큼 폭이 좁아져도 된다. 대신 비활성 탭도 닫을 수는 있어야 하므로,
       * 아래 `headerCloseButtonHover`가 `.header` 위에 겹쳐 뜬다(레이아웃 폭에 안 낀다).
       *
       * 닫기 버튼은 활성·비활성·dirty 여부와 무관하게 항상 보이고 항상 눌린다(2026-09,
       * 터치 기기에 hover가 없어 "안 보이지만 눌리는" 버튼이 탭 전환을 가로채던 버그의 수정 —
       * hover로 숨겼다 보여주는 크로스페이드 자체를 없앴다). dirty 표시(점)도 같이 없앴다 —
       * 닫기 버튼이 그 자리를 항상 차지하므로 둘 다 보일 자리가 없다.
       */}
      {isActive ? (
        <span className={classNames.headerActionSlot}>
          <IconButton
            variant="invisible"
            size="small"
            aria-label={`${title} 닫기`}
            draggable={false}
            className={classNames.headerCloseButtonPinned}
            onClick={handleHeaderCloseClick(onClose)}
            onDragStart={preventDragStart}
            icon={() => <Icon iconId="close" size="sm" />}
          />
        </span>
      ) : (
        <IconButton
          variant="invisible"
          size="small"
          aria-label={`${title} 닫기`}
          draggable={false}
          className={classNames.headerCloseButtonHover}
          onClick={handleHeaderCloseClick(onClose)}
          onDragStart={preventDragStart}
          icon={() => <Icon iconId="close" size="sm" />}
        />
      )}
    </div>
  );
};

// ─── Strip ───

export interface TabStripProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 지금 선택된 탭의 id. */
  readonly activeTab: TabId;
  /** 스트립에 표시할 탭 목록. */
  readonly tabItems: readonly TabItem[];
  /** 탭 헤더를 클릭하면 그 id와 함께 호출된다. */
  readonly onTabClick: (tabId: TabId) => void;
  /** 스트립 끝의 "더 보기" 메뉴 버튼을 클릭하면 호출된다. */
  readonly onMenuClick: () => void;
  /** 탭을 닫으면 그 id와 함께 호출된다. 없으면 닫기 버튼 자체가 안 뜬다. */
  readonly onTabClose?: (tabId: TabId) => void;
  /** 드래그로 순서를 바꾸면 새 전체 목록과 함께 호출된다. 없으면 드래그 재정렬이 꺼진다. */
  readonly onTabReorder?: (nextItems: TabItem[]) => void;
  /**
   * 미리보기 탭(`isPreview`)을 더블클릭하면 그 id와 함께 호출된다 — 없으면 더블클릭해도 아무
   * 일도 없다(옵트인). VSCode의 "미리보기 탭 더블클릭 시 고정" 관례. 이미 고정된 탭을 더블클릭
   * 하면 안 불린다.
   */
  readonly onTabPin?: (tabId: TabId) => void;
  /** `tabItems`가 빈 배열일 때 스트립 자리에 보여줄 내용. */
  readonly stripEmptyLabel?: ReactNode;
  /** 스트립 위에 겹쳐 그릴 내용(드롭존 표시 등) — 레이아웃에 영향을 주지 않는다. */
  readonly overlay?: ReactNode;
  /** 주어지면 탭 헤더가 우클릭에 반응해 이 결과를 `ContextMenu.Content`로 띄운다 — 없으면 지금처럼 아무 일도 없다(옵트인). */
  readonly renderTabContextMenu?: (tab: TabItem) => ReactNode;
}

export interface StripListHandlers {
  readonly onDragOver: DragEventHandler<HTMLDivElement>;
  readonly onDragLeave: DragEventHandler<HTMLDivElement>;
  readonly onDrop: DragEventHandler<HTMLDivElement>;
}

export interface StripDropIndicator {
  readonly targetId: TabId;
  readonly position: StripDropPosition;
}

export interface StripContextValue {
  readonly activeTab: TabId;
  readonly tabItems: readonly TabItem[];
  readonly reorderable: boolean;
  readonly onTabClick: (tabId: TabId) => void;
  readonly onMenuClick: () => void;
  readonly onTabClose?: (tabId: TabId) => void;
  readonly onTabReorder?: (nextItems: TabItem[]) => void;
  readonly onTabPin?: (tabId: TabId) => void;
  readonly renderTabContextMenu?: (tab: TabItem) => ReactNode;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>, item: TabItem) => void;
  readonly dropIndicator: StripDropIndicator | null;
  readonly setDropIndicator: Dispatch<SetStateAction<StripDropIndicator | null>>;
  readonly draggingId: TabId | null;
  readonly setDraggingId: Dispatch<SetStateAction<TabId | null>>;
  readonly listRef: MutableRefObject<HTMLDivElement | null>;
}

export interface StripItemHandlers {
  readonly draggable: boolean;
  readonly onClick: MouseEventHandler<HTMLDivElement>;
  readonly onDoubleClick: MouseEventHandler<HTMLDivElement>;
  readonly onDragStart: DragEventHandler<HTMLDivElement>;
  readonly onDragEnd: DragEventHandler<HTMLDivElement>;
  readonly onPointerDown: PointerEventHandler<HTMLDivElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLDivElement>;
}

export interface StripItemState {
  readonly tab: TabItem;
  readonly isActive: boolean;
  readonly isDraggable: boolean;
  readonly isDragging: boolean;
  readonly indicatorPosition: StripDropPosition | null;
  readonly onClose: () => void;
  readonly handlers: StripItemHandlers;
}

const StripContext = createContext<StripContextValue | null>(null);
const useStripContext = () => {
  const context = useContext(StripContext);
  if (!context) throw new Error('Tab.Strip parts must be used within Tab.Strip');
  return context;
};

const StripItems = () => {
  const classNames = useTabClassNames();
  const context = useStripContext();
  const items = getStripItemStates(context);
  const { renderTabContextMenu } = context;

  return (
    <>
      {items.map(({ tab, isActive, isDraggable, isDragging, indicatorPosition, onClose, handlers }) => {
        const header = (
          <Header
            {...handlers}
            iconId={tab.iconId}
            icon={tab.icon}
            title={tab.title}
            isActive={isActive}
            isDirty={tab.isDirty}
            isPreview={tab.isPreview}
            onClose={onClose}
            aria-grabbed={isDraggable ? isDragging : undefined}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={isDraggable ? classNames.stripDraggableHeader : undefined}
            data-tab-id={tab.id}
            data-reorderable={isDraggable ? '' : undefined}
            data-dragging={isDragging ? 'true' : 'false'}
          />
        );

        return (
          <div
            key={tab.id}
            role="presentation"
            className={classNames.stripItemWrapper}
            data-tab-drop-wrapper={tab.id}
            data-drop-target={indicatorPosition ?? undefined}
          >
            {indicatorPosition === 'before' ? (
              <span aria-hidden="true" className={classNames.stripIndicatorBefore} />
            ) : null}
            {renderTabContextMenu ? (
              <ContextMenu>
                <ContextMenu.Trigger className={classNames.headerContextMenuTrigger}>{header}</ContextMenu.Trigger>
                <ContextMenu.Content>{renderTabContextMenu(tab)}</ContextMenu.Content>
              </ContextMenu>
            ) : (
              header
            )}
            {indicatorPosition === 'after' ? (
              <span aria-hidden="true" className={classNames.stripIndicatorAfter} />
            ) : null}
          </div>
        );
      })}
    </>
  );
};

const StripMenu = () => {
  const { onMenuClick } = useStripContext();

  return (
    <IconButton
      variant="invisible"
      size="small"
      aria-label="Open tab actions"
      onClick={onMenuClick}
      icon={() => <Icon iconId="ellipsis" size="sm" />}
    />
  );
};

/** 실제 구현 — `data-component`를 스스로 찍지 않는다(공개 `Tab.Strip`이 필요하면 감싸서 찍는다). `Tab.Group`이 자기 안의 strip으로 그대로 재사용한다. */
const StripRootImpl = ({
  activeTab,
  tabItems,
  onTabClick,
  onMenuClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  renderTabContextMenu,
  stripEmptyLabel = 'No open tabs',
  overlay,
  className,
  classNames: providedClassNames,
  ...props
}: TabStripProps & { readonly classNames?: TabClassNames }) => {
  const inherited = useTabClassNames();
  const classNames = providedClassNames ?? inherited;
  const { context, listRef, listHandlers } = useTabStrip(
    activeTab,
    tabItems,
    onTabClick,
    onMenuClick,
    onTabClose,
    onTabReorder,
    onTabPin,
    renderTabContextMenu,
  );
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const { isOverflowing, onPointerDown: onScrollHandlePointerDown } = useStripScrollHandle(viewportRef);

  return (
    <ClassNamesContext.Provider value={classNames}>
      <StripContext.Provider value={context}>
        {/* `role="tablist"`는 실제 탭이 있는 안쪽 div 에만 건다 — 이 바깥 div 까지 tablist 로 두면
            `stripTail`의 "더보기" 버튼이 presentation 래퍼를 뚫고 tablist 의 허용되지 않는
            자식(role=button)으로 잡힌다(axe `aria-required-children`). tablist 의 유일한 실제
            자식은 role=tab 뿐이어야 한다. */}
        <div {...props} className={mergeClassNames(className, classNames.stripRoot)}>
          <Container ref={viewportRef} chrome="none" scroll="horizontal" className={classNames.stripListContainer}>
            <div ref={listRef} role="tablist" aria-orientation="horizontal" className={classNames.stripList} {...listHandlers}>
              {tabItems.length > 0 ? <StripItems /> : <div className={classNames.stripEmpty}>{stripEmptyLabel}</div>}
            </div>
          </Container>
          {isOverflowing ? (
            <div
              role="presentation"
              aria-hidden="true"
              data-orientation="horizontal"
              onPointerDown={onScrollHandlePointerDown}
              className={classNames.stripScrollHandle}
            />
          ) : null}
          <div className={classNames.stripTail}>
            <StripMenu />
          </div>
          {overlay}
        </div>
      </StripContext.Provider>
    </ClassNamesContext.Provider>
  );
};

// ─── Group ───

export interface GroupState {
  readonly activeTab: TabId;
  readonly selectedTab?: TabGroupItem;
  readonly hasPanel: boolean;
}

/** 프레임(테두리·radius·배경) 유무 — 패널을 꽉 채워서 쓸 땐 `none`. `ScrollArea`와 같은 이름. */
export type TabChrome = 'bordered' | 'none';

export interface TabGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
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
  /** 주어지면 탭 헤더가 우클릭에 반응해 이 결과를 `ContextMenu.Content`로 띄운다 — 없으면 지금처럼 아무 일도 없다(옵트인). */
  readonly renderTabContextMenu?: (tab: TabItem) => ReactNode;
  /** 프레임(테두리·radius·배경) 유무. 기본값 `'bordered'`. */
  readonly chrome?: TabChrome;
}

export const getGroupState = (tabItems: readonly TabGroupItem[], activeTab: TabId): GroupState => {
  const selected = tabItems.find((tab) => tab.id === activeTab) ?? tabItems[0];

  return {
    activeTab: selected?.id ?? activeTab,
    selectedTab: selected,
    hasPanel: Boolean(selected),
  };
};

const GroupContext = createContext<GroupState | null>(null);

/** 실제 구현 — `data-component`를 스스로 찍지 않는다(공개 `Tab.Group`과 Split의 leaf 양쪽에서 재사용한다). */
const GroupImpl = forwardRef<HTMLElement, TabGroupProps & { readonly classNames?: TabClassNames }>(
  (
    {
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
      ...props
    },
    ref,
  ) => {
    const inherited = useTabClassNames();
    const classNames = providedClassNames ?? inherited;
    const [currentActiveTab, setActiveTab] = useControlledState({ value: activeTab, defaultValue: defaultActiveTab, onChange: onActiveTabChange });
    const state = getGroupState(tabItems, currentActiveTab);
    const handleTabClick = (tabId: TabId) => {
      setActiveTab(tabId);
      onTabClick(tabId);
    };

    return (
      <ClassNamesContext.Provider value={classNames}>
        <GroupContext.Provider value={state}>
          <div {...props} ref={ref as Ref<HTMLDivElement>} className={mergeClassNames(className, classNames.group)}>
            {/* 탭이 하나도 없으면 Strip 자체를 렌더하지 않는다 — `stripEmptyLabel`은 빈 슬롯의
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
        </GroupContext.Provider>
      </ClassNamesContext.Provider>
    );
  },
);
GroupImpl.displayName = 'Tab.Group';

// ─── Split (트리) ───

export interface TabTreeLeaf {
  readonly kind: 'leaf';
  readonly id: string;
  readonly activeTab: TabId;
  readonly tabItems: readonly TabGroupItem[];
  readonly size?: number;
}

export interface TabTreeSplit {
  readonly kind: 'split';
  readonly id: string;
  readonly orientation: TabSplitOrientation;
  readonly children: readonly TabTreeNode[];
  readonly size?: number;
}

export type TabTreeNode = TabTreeLeaf | TabTreeSplit;

export interface TabSplitProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onDragStart' | 'onDrop'> {
  /** 분할 레이아웃 자체 — 리프(탭 그룹)와 가지(분할 방향+자식)가 재귀적으로 중첩된다. */
  readonly tree: TabTreeNode;
  /** 지금 포커스/활성 상태인 리프의 id. */
  readonly activeLeaf?: string;
  /** 어느 리프에서든 탭 헤더를 클릭하면 그 리프 id·탭 id와 함께 호출된다. */
  readonly onTabClick: (leafId: string, tabId: string) => void;
  /** 어느 리프에서든 "더 보기" 메뉴 버튼을 클릭하면 그 리프 id와 함께 호출된다. */
  readonly onMenuClick: (leafId: string) => void;
  /** 탭을 닫으면 그 리프 id·탭 id와 함께 호출된다. 없으면 닫기 버튼 자체가 안 뜬다. */
  readonly onTabClose?: (leafId: string, tabId: string) => void;
  /** 같은 리프 안에서 드래그로 순서를 바꾸면 그 리프 id·새 전체 목록과 함께 호출된다. */
  readonly onTabReorder?: (leafId: string, nextItems: TabGroupItem[]) => void;
  /**
   * 어느 리프에서든 미리보기 탭(`isPreview`)을 더블클릭하면 그 리프 id·탭 id와 함께 호출된다 —
   * 없으면 더블클릭해도 아무 일도 없다(옵트인).
   */
  readonly onTabPin?: (leafId: string, tabId: string) => void;
  /** 탭을 다른 리프로 드래그해 옮기면 원본/대상 리프 id·탭 id와 함께 호출된다. */
  readonly onTabMove?: (fromLeafId: string, toLeafId: string, tabId: string) => void;
  /** 탭을 리프 가장자리로 드래그해 새 분할을 만들면 원본 리프 id·탭 id·위치와 함께 호출된다. */
  readonly onTabSplit?: (sourceLeafId: string, tabId: string, position: SplitEdgeDropPosition) => void;
  /** 리사이즈 핸들을 드래그해 두 자식의 비율을 바꾸면 가지 id·자식 id·새 크기와 함께 호출된다. */
  readonly onNodeResize?: (branchId: string, childId: string, nextSize: number) => void;
  /** 리프의 `tabItems`가 빈 배열일 때 패널 자리에 보여줄 내용. */
  readonly emptyMessage?: ReactNode;
  /** 리프의 `tabItems`가 빈 배열일 때 스트립 자리에 보여줄 내용. */
  readonly stripEmptyLabel?: ReactNode;
  /** 주어지면 탭 헤더가 우클릭에 반응해 이 결과를 `ContextMenu.Content`로 띄운다 — 없으면 지금처럼 아무 일도 없다(옵트인). */
  readonly renderTabContextMenu?: (tab: TabItem) => ReactNode;
  /** 프레임(테두리·radius·배경) 유무. 기본값 `'bordered'`. */
  readonly chrome?: TabChrome;
}

/** `tree`를 주면 Split, 주지 않고 `tabItems`/`activeTab`을 주면 단일 Group으로 동작한다. */
export type TabRootProps = TabSplitProps | (TabGroupProps & { tree?: never });

export interface SplitState {
  readonly orientation: TabSplitOrientation;
  readonly sizes: number[];
  readonly disabledResize: boolean;
}

export interface SplitLeafHandlers {
  readonly onDragStart: DragEventHandler<HTMLElement>;
  readonly onDragOver: DragEventHandler<HTMLElement>;
  readonly onDragLeave: DragEventHandler<HTMLElement>;
  readonly onDropCapture: DragEventHandler<HTMLElement>;
  readonly onDragEnd: DragEventHandler<HTMLElement>;
}

export interface SplitResizeHandlers {
  readonly onPointerEnter: PointerEventHandler<HTMLButtonElement>;
  readonly onPointerLeave: PointerEventHandler<HTMLButtonElement>;
  readonly onFocus: FocusEventHandler<HTMLButtonElement>;
  readonly onBlur: FocusEventHandler<HTMLButtonElement>;
  readonly onPointerDown: PointerEventHandler<HTMLButtonElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
}

export interface SplitChildState {
  readonly node: TabTreeNode;
  readonly index: number;
  readonly isLast: boolean;
  readonly orientation: TabSplitOrientation;
  readonly isActive: boolean;
  readonly dropZone: TabDropZone | null;
  readonly dropPosition: SplitDropPosition | null;
  readonly isResizing: boolean;
  readonly isHandleVisible: boolean;
  readonly style: CSSProperties;
  readonly handlers?: SplitLeafHandlers;
  readonly resizeHandlers: SplitResizeHandlers;
}

export interface SplitBranchState {
  readonly ref: MutableRefObject<HTMLElement | null>;
  readonly orientation: TabSplitOrientation;
  readonly disabledResize: boolean;
  readonly childStates: readonly SplitChildState[];
}

export interface SplitRootLeafState {
  readonly node: TabTreeLeaf;
  readonly isActive: boolean;
  readonly dropZone: TabDropZone | null;
  readonly dropPosition: SplitDropPosition | null;
  readonly handlers: SplitLeafHandlers;
}

export type SplitDropIndicator =
  | { readonly leafId: string; readonly zone: 'panel'; readonly position: SplitDropPosition }
  | { readonly leafId: string; readonly zone: 'strip' };

export interface SplitContextValue {
  readonly visibleTree: TabTreeNode;
  readonly activeLeaf?: string;
  readonly onTabClick: (leafId: string, tabId: string) => void;
  readonly onMenuClick: (leafId: string) => void;
  readonly onTabClose?: (leafId: string, tabId: string) => void;
  readonly onTabReorder?: (leafId: string, nextItems: TabGroupItem[]) => void;
  readonly onTabMove?: (fromLeafId: string, toLeafId: string, tabId: string) => void;
  readonly onTabSplit?: (sourceLeafId: string, tabId: string, position: SplitEdgeDropPosition) => void;
  readonly onNodeResize?: (branchId: string, childId: string, nextSize: number) => void;
  readonly dragSourceRef: MutableRefObject<{ leafId: string; tabId: string } | null>;
  readonly dropIndicator: SplitDropIndicator | null;
  readonly setDropIndicator: Dispatch<SetStateAction<SplitDropIndicator | null>>;
  readonly resizingChildId: string | null;
  readonly setResizingChildId: Dispatch<SetStateAction<string | null>>;
  readonly visibleHandleChildId: string | null;
  readonly setVisibleHandleChildId: Dispatch<SetStateAction<string | null>>;
}

/** 하나의 DOM 노드에 내부 ref(리사이즈 측정용)와 밖에서 전달된 ref를 동시에 꽂는다. */
const mergeRefs =
  <T,>(...refs: ReadonlyArray<Ref<T> | null | undefined>): RefCallback<T> =>
  (node) => {
    for (const ref of refs) {
      if (ref == null) continue;
      if (typeof ref === 'function') ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };

// ─────────────────────────── Split leaf → Group 콜백 바인딩 ───────────────────────────

/** Split 의 leaf 하나가 자기 id 를 미리 채운 채로 안쪽 Group 에 콜백을 넘긴다(LeafSection/RootLeafSection 공용). */
const handleLeafTabClick = (onTabClick: (leafId: string, tabId: TabId) => void, leafId: string) => (tabId: TabId) => onTabClick(leafId, tabId);

const handleLeafMenuClick = (onMenuClick: (leafId: string) => void, leafId: string) => () => onMenuClick(leafId);

const handleLeafTabClose = (onTabClose: ((leafId: string, tabId: TabId) => void) | undefined, leafId: string) =>
  onTabClose ? (tabId: TabId) => onTabClose(leafId, tabId) : undefined;

const handleLeafTabReorder = (onTabReorder: ((leafId: string, nextItems: TabGroupItem[]) => void) | undefined, leafId: string) =>
  onTabReorder ? (nextItems: TabGroupItem[]) => onTabReorder(leafId, nextItems) : undefined;

const handleLeafTabPin = (onTabPin: ((leafId: string, tabId: TabId) => void) | undefined, leafId: string) =>
  onTabPin ? (tabId: TabId) => onTabPin(leafId, tabId) : undefined;

const SplitContext = createContext<SplitContextValue | null>(null);
const useSplitContext = () => {
  const context = useContext(SplitContext);
  if (!context) throw new Error('Tab.Split parts must be used within Tab.Split');
  return context;
};

const ResizeHandle = ({ state }: { state: SplitChildState }) => {
  const classNames = useTabClassNames();

  return state.isLast ? null : (
    <button
      type="button"
      {...state.resizeHandlers}
      aria-label={`Resize tab group ${state.node.id}`}
      aria-orientation={state.orientation === 'horizontal' ? 'vertical' : 'horizontal'}
      data-orientation={state.orientation}
      data-resizing={state.isResizing ? 'true' : 'false'}
      data-visible={state.isHandleVisible ? 'true' : 'false'}
      className={classNames.resizeHandle}
    />
  );
};

type LeafPassthrough = Pick<
  TabSplitProps,
  'onTabClick' | 'onMenuClick' | 'onTabClose' | 'onTabReorder' | 'onTabPin' | 'emptyMessage' | 'stripEmptyLabel' | 'renderTabContextMenu'
>;

const LeafSection = ({
  state,
  onTabClick,
  onMenuClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  emptyMessage,
  stripEmptyLabel,
  renderTabContextMenu,
}: { state: SplitChildState } & LeafPassthrough) => {
  const classNames = useTabClassNames();
  const leaf = state.node as TabTreeLeaf;

  return (
    <section
      {...state.handlers}
      data-active={state.isActive ? '' : undefined}
      className={mergeClassNames(undefined, classNames.leafSection, state.isActive && classNames.leafSectionActive)}
      style={state.style}
    >
      <GroupImpl
        activeTab={leaf.activeTab}
        tabItems={leaf.tabItems}
        onTabClick={handleLeafTabClick(onTabClick, leaf.id)}
        onMenuClick={handleLeafMenuClick(onMenuClick, leaf.id)}
        onTabClose={handleLeafTabClose(onTabClose, leaf.id)}
        onTabReorder={handleLeafTabReorder(onTabReorder, leaf.id)}
        onTabPin={handleLeafTabPin(onTabPin, leaf.id)}
        emptyMessage={emptyMessage}
        stripEmptyLabel={stripEmptyLabel}
        renderTabContextMenu={renderTabContextMenu}
        className={classNames.leafGroup}
        panelLabel={`Tab group ${leaf.id}`}
        panelOverlay={
          state.dropZone === 'panel' && state.dropPosition ? (
            <span aria-hidden="true" data-position={state.dropPosition} className={classNames.panelDropIndicator} />
          ) : undefined
        }
        stripOverlay={state.dropZone === 'strip' ? <span aria-hidden="true" className={classNames.stripDropOverlay} /> : undefined}
      />
      <ResizeHandle state={state} />
    </section>
  );
};

const SplitBranch = forwardRef<
  HTMLElement,
  {
    node: TabTreeSplit;
    isRoot?: boolean;
    rootProps?: Omit<HTMLAttributes<HTMLDivElement>, 'children'>;
    className?: string;
    childState?: SplitChildState;
  } & LeafPassthrough
>(
  (
    {
      node,
      isRoot = false,
      rootProps,
      className,
      childState,
      onTabClick,
      onMenuClick,
      onTabClose,
      onTabReorder,
      onTabPin,
      emptyMessage,
      stripEmptyLabel,
      renderTabContextMenu,
    },
    ref,
  ) => {
    const classNames = useTabClassNames();
    const shared = useSplitContext();
    const branch = useSplitBranch(node, shared);
    const isHorizontal = branch.orientation === 'horizontal';
    const showDivider = Boolean(childState && !childState.isLast);

    return (
      <div
        {...(isRoot ? rootProps : {})}
        ref={mergeRefs<HTMLElement>(branch.ref, isRoot ? ref : null)}
        data-orientation={branch.orientation}
        style={isRoot ? undefined : childState?.style}
        className={mergeClassNames(
          isRoot ? className : undefined,
          isRoot
            ? isHorizontal
              ? classNames.splitRootHorizontal
              : classNames.splitRootVertical
            : isHorizontal
              ? classNames.splitBranchHorizontal
              : classNames.splitBranchVertical,
          showDivider &&
            (childState?.orientation === 'horizontal'
              ? classNames.splitBranchDividerHorizontal
              : classNames.splitBranchDividerVertical),
        )}
      >
        {branch.childStates.map((state) =>
          state.node.kind === 'leaf' ? (
            <LeafSection
              key={state.node.id}
              state={state}
              onTabClick={onTabClick}
              onMenuClick={onMenuClick}
              onTabClose={onTabClose}
              onTabReorder={onTabReorder}
              onTabPin={onTabPin}
              emptyMessage={emptyMessage}
              stripEmptyLabel={stripEmptyLabel}
              renderTabContextMenu={renderTabContextMenu}
            />
          ) : (
            <SplitBranch
              key={state.node.id}
              node={state.node}
              childState={state}
              onTabClick={onTabClick}
              onMenuClick={onMenuClick}
              onTabClose={onTabClose}
              onTabReorder={onTabReorder}
              onTabPin={onTabPin}
              emptyMessage={emptyMessage}
              stripEmptyLabel={stripEmptyLabel}
              renderTabContextMenu={renderTabContextMenu}
            />
          ),
        )}
        {!isRoot && childState ? <ResizeHandle state={childState} /> : null}
      </div>
    );
  },
);
SplitBranch.displayName = 'Tab.Split.Branch';

const RootLeafSection = forwardRef<
  HTMLElement,
  {
    leaf: TabTreeLeaf;
    rootProps: Omit<HTMLAttributes<HTMLDivElement>, 'children'>;
    className?: string;
  } & LeafPassthrough
>(({ leaf, rootProps, className, onTabClick, onMenuClick, onTabClose, onTabReorder, onTabPin, emptyMessage, stripEmptyLabel, renderTabContextMenu }, ref) => {
  const classNames = useTabClassNames();
  const shared = useSplitContext();
  const state = getRootLeafState(leaf, shared);

  return (
    <section
      {...rootProps}
      {...state.handlers}
      ref={ref}
      className={mergeClassNames(className, classNames.rootLeafSection)}
    >
      <GroupImpl
        activeTab={leaf.activeTab}
        tabItems={leaf.tabItems}
        onTabClick={handleLeafTabClick(onTabClick, leaf.id)}
        onMenuClick={handleLeafMenuClick(onMenuClick, leaf.id)}
        onTabClose={handleLeafTabClose(onTabClose, leaf.id)}
        onTabReorder={handleLeafTabReorder(onTabReorder, leaf.id)}
        onTabPin={handleLeafTabPin(onTabPin, leaf.id)}
        emptyMessage={emptyMessage}
        stripEmptyLabel={stripEmptyLabel}
        renderTabContextMenu={renderTabContextMenu}
        className={classNames.rootLeafGroup}
        panelLabel={`Tab group ${leaf.id}`}
        panelOverlay={
          state.dropZone === 'panel' && state.dropPosition ? (
            <span aria-hidden="true" data-position={state.dropPosition} className={classNames.panelDropIndicator} />
          ) : undefined
        }
        stripOverlay={state.dropZone === 'strip' ? <span aria-hidden="true" className={classNames.stripDropOverlay} /> : undefined}
      />
    </section>
  );
});
RootLeafSection.displayName = 'Tab.Split.RootLeafSection';

/** 실제 구현 — `data-component`를 스스로 찍지 않는다(공개 `Tab.Split`이 필요하면 감싸서 찍는다). */
const SplitRootImpl = forwardRef<HTMLElement, TabSplitProps & { readonly classNames?: TabClassNames }>(
  (
    {
      tree,
      activeLeaf,
      onTabClick,
      onMenuClick,
      onTabClose,
      onTabReorder,
      onTabPin,
      onTabMove,
      onTabSplit,
      onNodeResize,
      emptyMessage,
      stripEmptyLabel,
      renderTabContextMenu,
      className,
      classNames: providedClassNames,
      ...rootProps
    },
    ref,
  ) => {
    const inherited = useTabClassNames();
    const classNames = providedClassNames ?? inherited;
    const { visibleTree, context } = useTabSplit({
      tree,
      activeLeaf,
      onTabClick,
      onMenuClick,
      onTabClose,
      onTabReorder,
      onTabMove,
      onTabSplit,
      onNodeResize,
    });

    const passthrough = { onTabClick, onMenuClick, onTabClose, onTabReorder, onTabPin, emptyMessage, stripEmptyLabel, renderTabContextMenu };
    const rootPropsWithData = { ...rootProps, 'data-component': 'Tab' };

    return (
      <ClassNamesContext.Provider value={classNames}>
        <SplitContext.Provider value={context}>
          {visibleTree.kind === 'leaf' ? (
            <RootLeafSection ref={ref} leaf={visibleTree} rootProps={rootPropsWithData} className={className} {...passthrough} />
          ) : (
            <SplitBranch ref={ref} node={visibleTree} isRoot rootProps={rootPropsWithData} className={className} {...passthrough} />
          )}
        </SplitContext.Provider>
      </ClassNamesContext.Provider>
    );
  },
);
SplitRootImpl.displayName = 'Tab.Split';

// ─── 조립 ───

/**
 * 여기가 슬롯별 클래스를 한 번 정의해 넘긴다.
 *
 * `chrome`(소비자가 고르는 진짜 variant, `Container`와 같은 축)만 여기서 갈라 합성한다 —
 * 나머지(orientation·divider·active·alwaysVisible)는 전부 상태로 고르는 `[data-*]` 슬롯이라
 * `Tab.module.css`의 속성 선택자가 그대로 처리한다.
 */
const buildClassNames = (chrome?: TabChrome): TabClassNames => {
  const frame = chrome === 'none' ? undefined : styles['chromeBordered'];

  return {
    header: styles['header'],
    // 미리보기 탭은 제목을 기울인다 — VSCode 와 같은 신호다(`[data-preview]`, Tab.module.css).
    headerLabel: styles['headerLabel'],
    headerActionSlot: styles['headerActionSlot'],
    headerCloseButtonHover: styles['headerCloseButtonHover'],
    /**
     * 글자 옆 아이콘을 1px 내린다.
     *
     * 아이콘은 줄상자에 기하적으로 중앙 정렬되지만, 눈은 글자를 **x-height 띠**로 읽는다.
     * `AGENTS.md` 처럼 디센더가 없는 문자열은 em 상자 아래가 비어서 글자 몸통이 아래로 밀리고,
     * 그만큼 아이콘이 떠 보인다(실측 1px). 아이콘 혼자 놓이는 자리(활동 바 등)에는 걸지 않는다 —
     * 거기서는 지금이 맞다.
     */
    headerIcon: styles['headerIcon'],
    headerCloseButtonPinned: styles['headerCloseButtonPinned'],
    headerContextMenuTrigger: styles['headerContextMenuTrigger'],

    stripRoot: styles['stripRoot'],
    stripListContainer: styles['stripListContainer'],
    stripList: styles['stripList'],
    stripEmpty: styles['stripEmpty'],
    stripTail: styles['stripTail'],
    stripItemWrapper: styles['stripItemWrapper'],
    stripIndicatorBefore: styles['stripIndicatorBefore'],
    stripIndicatorAfter: styles['stripIndicatorAfter'],
    stripDraggableHeader: styles['stripDraggableHeader'],
    stripDropOverlay: styles['stripDropOverlay'],
    stripScrollHandle: styles['stripScrollHandle'],

    group: mergeClassNames(undefined, styles['group'], frame),
    groupStrip: styles['groupStrip'],
    groupPanelWrapper: styles['groupPanelWrapper'],
    // 패널은 여백을 두지 않는다 — 여백을 주면 안에 놓인 것이 영역을 채우지 못하고 카드처럼 뜬다.
    // 여백이 필요한 내용은 스스로 준다.
    groupPanel: styles['groupPanel'],
    groupPanelContent: styles['groupPanelContent'],
    groupPanelEmpty: styles['groupPanelEmpty'],
    panelDropIndicator: styles['panelDropIndicator'],

    splitRootHorizontal: mergeClassNames(undefined, styles['splitRootHorizontal'], frame),
    splitRootVertical: mergeClassNames(undefined, styles['splitRootVertical'], frame),
    splitBranchHorizontal: styles['splitBranchHorizontal'],
    splitBranchVertical: styles['splitBranchVertical'],
    splitBranchDividerHorizontal: styles['splitBranchDividerHorizontal'],
    splitBranchDividerVertical: styles['splitBranchDividerVertical'],
    leafSection: styles['leafSection'],
    leafSectionActive: styles['leafSectionActive'],
    leafGroup: styles['leafGroup'],
    rootLeafSection: styles['rootLeafSection'],
    rootLeafGroup: styles['rootLeafGroup'],
    resizeHandle: styles['resizeHandle'],
  };
};

const StripRoot = ({ className, ...props }: TabStripProps) => (
  <StripRootImpl {...props} classNames={buildClassNames()} className={className} />
);

/** 탭 헤더들을 가로로 늘어놓는 띠 — 넘치면 스크롤하고, 다 안 보이는 탭은 오버플로 메뉴로 묶는다. */
const Strip = assembleCompound('Tab.Strip', StripRoot, { Items: StripItems, Menu: StripMenu });

/**
 * Strip과 활성 탭의 내용(`children`)을 세로로 붙인 패널 하나 — 분할이 없을 때 `Tab`이 렌더하는
 * 기본 단위.
 *
 * `data-component` 는 여기서 리터럴로 정한다 — 실제 DOM에 닿는 자리(`GroupImpl`)가 하나뿐이라
 * 다른 컴포넌트와 같은 자리다.
 */
const Group = forwardRef<HTMLElement, TabGroupProps>(({ className, chrome, ...props }, ref) => (
  <GroupImpl {...props} ref={ref} classNames={buildClassNames(chrome)} className={className} data-component="Tab" />
));
Group.displayName = 'Tab.Group';

/**
 * Split 은 leaf 하나뿐일 때와 branch 가 있을 때 렌더되는 태그가 다르다(`section`/`div`) —
 * `SplitRootImpl`이 안다.
 */
const SplitRoot = forwardRef<HTMLElement, TabSplitProps>(({ className, chrome, ...props }, ref) => (
  <SplitRootImpl {...props} ref={ref} classNames={buildClassNames(chrome)} className={className} data-component="Tab" />
));
SplitRoot.displayName = 'Tab.Split';

/**
 * `Group` 여러 개를 리사이즈 가능한 트리로 나눠 담는 컨테이너 — `tree`가 leaf 하나뿐이면 `Group`
 * 하나와 동일하게 보인다.
 */
const Split = assembleCompound('Tab.Split', SplitRoot, {});

/** `tree`가 있으면 Split, 없으면 단일 Group으로 동작한다. */
const Root = forwardRef<HTMLElement, TabRootProps>((props, ref) =>
  props.tree ? <Split {...props} ref={ref} /> : <Group {...props} ref={ref} />,
);
Root.displayName = 'Tab';

export type { TabRootProps as TabProps };

/**
 * Storybook Docs 서브컴포넌트 섹션 전용 재노출 — 공개 API는 `Tab.Header`/`Tab.Strip`/
 * `Tab.Group`/`Tab.Split`으로만 접근한다(`index.ts`엔 안 싣는다). react-docgen-typescript가
 * 파일의 최상위 export만 컴포넌트로 인식해서, 비export 지역 함수엔 `__docgenInfo`가 안 붙는다
 * (2026-09-06 실측 확인) — Docs 페이지의 서브컴포넌트 Props 표를 뽑으려면 이 재노출이 필요하다.
 */
export { Header as TabHeaderDoc, Strip as TabStripDoc, Group as TabGroupDoc, Split as TabSplitDoc };

export const Tab = assembleCompound('Tab', Root, { Header, Strip, Group, Split });
