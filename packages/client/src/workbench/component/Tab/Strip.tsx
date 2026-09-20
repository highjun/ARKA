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

export interface TabStripProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  readonly tabs: readonly TabRow[];
  readonly activeTabId: TabId | null;
  readonly onSelect?: (tabId: TabId) => void;
  readonly onClose?: (tabId: TabId) => void;
  readonly onReorder?: (nextTabIds: readonly TabId[]) => void;
  readonly onPin?: (tabId: TabId) => void;
  readonly renderTabMenu?: (tabId: TabId) => ReactNode;
  readonly overlay?: ReactNode;
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

interface StripItemHandlers {
  readonly draggable: boolean;
  readonly onDoubleClick: MouseEventHandler<HTMLDivElement>;
  readonly onDragStart: DragEventHandler<HTMLDivElement>;
  readonly onDragEnd: DragEventHandler<HTMLDivElement>;
  readonly onPointerDown: PointerEventHandler<HTMLDivElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLDivElement>;
}

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
