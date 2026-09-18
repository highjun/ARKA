import { createContext, useContext, useRef } from "react";
import type {
  ComponentPropsWithoutRef,
  Dispatch,
  DragEventHandler,
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
import { Menu } from "#component/Menu";
import type { StripDropPosition, TabClassNames, TabId, TabRow } from "./shared";
import { ClassNamesContext, useTabClassNames } from "./TabContext";
import { TabHeader } from "./Header";

/** 콜백이 없으면 그 기능 자체가 꺼진다 — `onClose`가 없으면 닫기 버튼도, `onReorder`가 없으면 드래그 재정렬도 안 뜬다. */
export interface TabStripProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  /** 스트립에 표시할 탭 목록. */
  readonly tabs: readonly TabRow[];
  /** 지금 선택된 탭의 id. 없으면 `null`. */
  readonly activeTabId: TabId | null;
  /** 탭 헤더를 클릭하면 그 id와 함께 호출된다. */
  readonly onSelect?: (tabId: TabId) => void;
  /** 탭을 닫으면 그 id와 함께 호출된다. */
  readonly onClose?: (tabId: TabId) => void;
  /** 드래그로 순서를 바꾸면 새 id 순서와 함께 호출된다. */
  readonly onReorder?: (nextTabIds: readonly TabId[]) => void;
  /**
   * 미리보기 탭(`isPreview`)을 더블클릭하면 그 id와 함께 호출된다 — 없으면 더블클릭해도 아무
   * 일도 없다(옵트인). VSCode의 "미리보기 탭 더블클릭 시 고정" 관례. 이미 고정된 탭을 더블클릭
   * 하면 안 불린다.
   */
  readonly onPin?: (tabId: TabId) => void;
  /** 주어지면 탭 헤더가 우클릭에 반응해 이 결과를 `Menu.Content`로 띄운다 — 없으면 아무 일도 없다(옵트인). */
  readonly renderTabMenu?: (tabId: TabId) => ReactNode;
  /** 스트립 위에 겹쳐 그릴 내용(드롭존 표시 등) — 레이아웃에 영향을 주지 않는다. */
  readonly overlay?: ReactNode;
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
  readonly tabs: readonly TabRow[];
  readonly activeTabId: TabId | null;
  readonly reorderable: boolean;
  readonly onSelect?: (tabId: TabId) => void;
  readonly onClose?: (tabId: TabId) => void;
  readonly onReorder?: (nextTabIds: readonly TabId[]) => void;
  readonly onPin?: (tabId: TabId) => void;
  readonly renderTabMenu?: (tabId: TabId) => ReactNode;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>, tab: TabRow) => void;
  readonly dropIndicator: StripDropIndicator | null;
  readonly setDropIndicator: Dispatch<SetStateAction<StripDropIndicator | null>>;
  readonly draggingId: TabId | null;
  readonly setDraggingId: Dispatch<SetStateAction<TabId | null>>;
  readonly listRef: MutableRefObject<HTMLDivElement | null>;
}

/** 항목 하나에 그대로 펼쳐 붙이는 핸들러 묶음. 클릭은 `onSelect`로 따로 간다. */
interface StripItemHandlers {
  readonly draggable: boolean;
  readonly onDoubleClick: MouseEventHandler<HTMLDivElement>;
  readonly onDragStart: DragEventHandler<HTMLDivElement>;
  readonly onDragEnd: DragEventHandler<HTMLDivElement>;
  readonly onPointerDown: PointerEventHandler<HTMLDivElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLDivElement>;
}

/** 항목 하나가 그릴 때 보는 파생 상태. Context에서 자기 몫만 뽑은 것이다. */
export interface StripItemState {
  readonly tab: TabRow;
  readonly isActive: boolean;
  readonly isDraggable: boolean;
  readonly isDragging: boolean;
  readonly indicatorPosition: StripDropPosition | null;
  readonly onSelect: () => void;
  readonly onClose: (() => void) | undefined;
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
  const { renderTabMenu } = context;

  return (
    <>
      {items.map(({ tab, isActive, isDraggable, isDragging, indicatorPosition, onSelect, onClose, handlers }) => {
        const header = (
          <TabHeader
            {...handlers}
            tab={tab}
            isActive={isActive}
            onSelect={onSelect}
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
            {renderTabMenu ? (
              <Menu kind="context">
                <Menu.Trigger className={classNames.headerContextMenuTrigger}>{header}</Menu.Trigger>
                <Menu.Content>{renderTabMenu(tab.id)}</Menu.Content>
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

/** 실제 구현 — `data-component`를 스스로 찍지 않는다(공개 `Tab.Strip`이 필요하면 감싸서 찍는다). `Tab.Group`이 자기 안의 strip으로 그대로 재사용한다. */
export const StripRootImpl = ({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onReorder,
  onPin,
  renderTabMenu,
  overlay,
  className,
  classNames: providedClassNames,
  ...props
}: TabStripProps & { readonly classNames?: TabClassNames }) => {
  const inherited = useTabClassNames();
  const classNames = providedClassNames ?? inherited;
  const { context, listRef, listHandlers } = useTabStrip({
    tabs,
    activeTabId,
    onSelect,
    onClose,
    onReorder,
    onPin,
    renderTabMenu,
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const { isOverflowing, onPointerDown: onScrollHandlePointerDown } = useStripScrollHandle(viewportRef);

  return (
    <ClassNamesContext value={classNames}>
      <StripContext value={context}>
        {/* `role="tablist"`는 실제 탭이 있는 안쪽 div 에만 건다 — tablist 의 유일한 실제 자식은 role=tab 뿐이어야 한다
            (axe `aria-required-children`). */}
        <div {...props} className={clsx(className, classNames.stripRoot)}>
          <Container ref={viewportRef} chrome="none" scroll="horizontal" className={classNames.stripListContainer}>
            <div
              ref={listRef}
              role="tablist"
              aria-orientation="horizontal"
              className={classNames.stripList}
              {...listHandlers}
            >
              <StripItems />
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
          {overlay}
        </div>
      </StripContext>
    </ClassNamesContext>
  );
};
