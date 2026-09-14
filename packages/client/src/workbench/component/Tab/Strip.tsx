import { createContext, useContext, useRef } from "react";
import type {
  Dispatch,
  DragEventHandler,
  HTMLAttributes,
  KeyboardEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  MutableRefObject,
  PointerEventHandler,
  ReactNode,
  SetStateAction,
} from "react";
import { clsx } from "clsx";
import { getStripItemStates, useStripScrollHandle, useTabStrip } from "./useTabStrip";
import { Container } from "#component/Container";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Menu } from "#component/Menu";
import type { StripDropPosition, TabClassNames, TabId, TabItem } from "./shared";
import { ClassNamesContext, useTabClassNames } from "./TabContext";
import { TabHeader } from "./Header";

/** 콜백이 없으면 그 기능 자체가 꺼진다 — `onTabClose`가 없으면 닫기 버튼도 안 뜬다. */
export interface TabStripProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
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
  /** 주어지면 탭 헤더가 우클릭에 반응해 이 결과를 `Menu.Content`로 띄운다 — 없으면 지금처럼 아무 일도 없다(옵트인). */
  readonly renderTabContextMenu?: (tab: TabItem) => ReactNode;
}

/** 목록 전체가 받는 드래그 핸들러 — 항목 단위는 `StripItemHandlers`다. */
export interface StripListHandlers {
  readonly onDragOver: DragEventHandler<HTMLDivElement>;
  readonly onDragLeave: DragEventHandler<HTMLDivElement>;
  readonly onDrop: DragEventHandler<HTMLDivElement>;
}

/** 지금 어느 탭의 어느 쪽에 선이 그려지는가. 드래그 중에만 값이 있다. */
export interface StripDropIndicator {
  readonly targetId: TabId;
  readonly position: StripDropPosition;
}

/** 스트립이 항목들에게 내려보내는 것 전부 — prop 드릴링 대신 Context로 간다. */
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

/** 항목 하나에 그대로 펼쳐 붙이는 핸들러 묶음. */
interface StripItemHandlers {
  readonly draggable: boolean;
  readonly onClick: MouseEventHandler<HTMLDivElement>;
  readonly onDoubleClick: MouseEventHandler<HTMLDivElement>;
  readonly onDragStart: DragEventHandler<HTMLDivElement>;
  readonly onDragEnd: DragEventHandler<HTMLDivElement>;
  readonly onPointerDown: PointerEventHandler<HTMLDivElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLDivElement>;
}

/** 항목 하나가 그릴 때 보는 파생 상태. Context에서 자기 몫만 뽑은 것이다. */
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
  if (!context) throw new Error("Tab.Strip parts must be used within Tab.Strip");
  return context;
};

/** 탭 헤더를 순서대로 그린다 — 드래그 재정렬과 드롭 표시가 여기 붙는다. 상태는 전부 context에서 읽는다. */
export const StripItems = () => {
  const classNames = useTabClassNames();
  const context = useStripContext();
  const items = getStripItemStates(context);
  const { renderTabContextMenu } = context;

  return (
    <>
      {items.map(({ tab, isActive, isDraggable, isDragging, indicatorPosition, onClose, handlers }) => {
        const header = (
          <TabHeader
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
            data-reorderable={isDraggable ? "" : undefined}
            data-dragging={isDragging ? "true" : "false"}
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
            {indicatorPosition === "before" ? (
              <span aria-hidden="true" className={classNames.stripIndicatorBefore} />
            ) : null}
            {renderTabContextMenu ? (
              <Menu kind="context">
                <Menu.Trigger className={classNames.headerContextMenuTrigger}>{header}</Menu.Trigger>
                <Menu.Content>{renderTabContextMenu(tab)}</Menu.Content>
              </Menu>
            ) : (
              header
            )}
            {indicatorPosition === "after" ? (
              <span aria-hidden="true" className={classNames.stripIndicatorAfter} />
            ) : null}
          </div>
        );
      })}
    </>
  );
};

/** 스트립 끝의 "더 보기" 버튼 — 넘쳐서 안 보이는 탭을 여는 자리다. */
export const StripMenu = () => {
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
export const StripRootImpl = ({
  activeTab,
  tabItems,
  onTabClick,
  onMenuClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  renderTabContextMenu,
  stripEmptyLabel = "No open tabs",
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
    <ClassNamesContext value={classNames}>
      <StripContext value={context}>
        {/* `role="tablist"`는 실제 탭이 있는 안쪽 div 에만 건다 — 이 바깥 div 까지 tablist 로 두면
            `stripTail`의 "더보기" 버튼이 presentation 래퍼를 뚫고 tablist 의 허용되지 않는
            자식(role=button)으로 잡힌다(axe `aria-required-children`). tablist 의 유일한 실제
            자식은 role=tab 뿐이어야 한다. */}
        <div {...props} className={clsx(className, classNames.stripRoot)}>
          <Container ref={viewportRef} chrome="none" scroll="horizontal" className={classNames.stripListContainer}>
            <div
              ref={listRef}
              role="tablist"
              aria-orientation="horizontal"
              className={classNames.stripList}
              {...listHandlers}
            >
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
      </StripContext>
    </ClassNamesContext>
  );
};
