import { createContext, useContext, useRef } from "react";
import type {
  ComponentPropsWithoutRef,
  Dispatch,
  DragEventHandler,
  KeyboardEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
  Ref,
  RefObject,
  SetStateAction,
} from "react";
import { clsx } from "clsx";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Container } from "#ui/Container";
import { Menu } from "#ui/Menu";
import styles from "./Tab.module.css";
import { getStripItemStates, useStripScrollHandle, useTabStrip } from "./useTabStrip";
import { Item } from "./Item";
import { resolveActiveItem } from "./shared";
import type { StripDropPosition, TabId, TabItem } from "./shared";

export interface TabStripProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly items: readonly TabItem[];
  readonly activeItemId?: TabId | null;
  readonly defaultActiveItemId?: TabId | null;
  /** 탭 우클릭 메뉴. 없으면 메뉴를 달지 않는다. */
  readonly renderItemMenu?: (itemId: TabId) => ReactNode;
  readonly onItemSelect?: (itemId: TabId) => void;
  /** 없으면 닫기 버튼 자체를 안 그린다. */
  readonly onItemClose?: (itemId: TabId) => void;
  /**
   * 탭을 이 띠의 `beforeItemId` 앞으로 옮긴다 — 맨 뒤면 `null`.
   * 다른 띠에서 끌어온 탭도 같은 길로 들어온다. 없으면 끌어 옮기기를 끈다.
   */
  readonly onItemMove?: StripItemMove;
  /** 미리보기 탭 더블클릭. 없으면 더블클릭이 아무 일도 안 한다. */
  readonly onItemPin?: (itemId: TabId) => void;
}

export interface StripListHandlers {
  readonly onDragOver: DragEventHandler<HTMLDivElement>;
  readonly onDragLeave: DragEventHandler<HTMLDivElement>;
  readonly onDrop: DragEventHandler<HTMLDivElement>;
}

/** 탭을 이 띠의 어느 자리로 옮긴다. `beforeItemId`가 `null`이면 맨 뒤. */
export type StripItemMove = (itemId: TabId, beforeItemId: TabId | null) => void;

export interface StripDropIndicator {
  readonly targetId: TabId;
  readonly position: StripDropPosition;
}

export interface StripContextValue {
  readonly items: readonly TabItem[];
  readonly activeItemId: TabId | null;
  readonly movable: boolean;
  readonly onItemSelect?: (itemId: TabId) => void;
  readonly onItemClose?: (itemId: TabId) => void;
  readonly onItemMove?: StripItemMove;
  readonly onItemPin?: (itemId: TabId) => void;
  readonly renderItemMenu?: (itemId: TabId) => ReactNode;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>, item: TabItem) => void;
  readonly dropIndicator: StripDropIndicator | null;
  readonly setDropIndicator: Dispatch<SetStateAction<StripDropIndicator | null>>;
  readonly draggingId: TabId | null;
  readonly setDraggingId: Dispatch<SetStateAction<TabId | null>>;
  readonly listRef: RefObject<HTMLDivElement | null>;
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
  readonly item: TabItem;
  readonly isActive: boolean;
  readonly isDraggable: boolean;
  readonly isDragging: boolean;
  readonly indicatorPosition: StripDropPosition | null;
  readonly onItemSelect: () => void;
  readonly onItemClose: (() => void) | undefined;
  readonly handlers: StripItemHandlers;
}

const StripContext = createContext<StripContextValue | null>(null);
const useStripContext = () => {
  const context = useContext(StripContext);
  if (!context) throw new Error("Tab.Strip parts must be used within Tab.Strip");
  return context;
};

const StripItems = () => {
  const context = useStripContext();
  const { renderItemMenu } = context;

  return (
    <>
      {getStripItemStates(context).map((state) => {
        const item = (
          <Item
            {...state.handlers}
            item={state.item}
            isActive={state.isActive}
            onItemSelect={state.onItemSelect}
            onItemClose={state.onItemClose}
            aria-grabbed={state.isDraggable ? state.isDragging : undefined}
            aria-selected={state.isActive}
            tabIndex={state.isActive ? 0 : -1}
            className={state.isDraggable ? styles["stripDraggableItem"] : undefined}
            data-tab-id={state.item.id}
            data-movable={state.isDraggable ? "" : undefined}
            data-dragging={state.isDragging ? "true" : "false"}
          />
        );

        return (
          <div
            key={state.item.id}
            role="presentation"
            className={styles["stripItemWrapper"]}
            data-tab-drop-wrapper={state.item.id}
            data-drop-target={state.indicatorPosition ?? undefined}
          >
            {state.indicatorPosition === "before" ? (
              <span aria-hidden="true" className={styles["stripIndicatorBefore"]} />
            ) : null}
            {renderItemMenu ? (
              <Menu kind="context">
                <Menu.Trigger className={styles["itemMenuTrigger"]}>{item}</Menu.Trigger>
                <Menu.Content>{renderItemMenu(state.item.id)}</Menu.Content>
              </Menu>
            ) : (
              item
            )}
            {state.indicatorPosition === "after" ? (
              <span aria-hidden="true" className={styles["stripIndicatorAfter"]} />
            ) : null}
          </div>
        );
      })}
    </>
  );
};

export const Strip = ({
  items,
  activeItemId,
  defaultActiveItemId = null,
  renderItemMenu,
  onItemSelect,
  onItemClose,
  onItemMove,
  onItemPin,
  className,
  ref,
  ...props
}: TabStripProps) => {
  const [current, setCurrent] = useControllableState<TabId | null>({
    prop: activeItemId,
    defaultProp: defaultActiveItemId,
    caller: "Tab.Strip",
  });
  const { context, listRef, listHandlers } = useTabStrip({
    items,
    activeItemId: resolveActiveItem(items, current ?? null)?.id ?? null,
    onItemSelect: (itemId) => {
      setCurrent(itemId);
      onItemSelect?.(itemId);
    },
    onItemClose,
    onItemMove,
    onItemPin,
    renderItemMenu,
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const { thumb, onPointerDown: onScrollHandlePointerDown } = useStripScrollHandle(viewportRef);

  return (
    <StripContext value={context}>
      <div ref={ref} {...props} data-component="Tab/Strip" className={clsx(className, styles["stripRoot"])}>
        <Container
          ref={viewportRef}
          chrome="none"
          scroll="horizontal"
          scrollbar="none"
          className={styles["stripListContainer"]}
        >
          <div
            ref={listRef}
            role="tablist"
            aria-orientation="horizontal"
            className={styles["stripList"]}
            {...listHandlers}
          >
            <StripItems />
          </div>
        </Container>
        {thumb.isOverflowing ? (
          <div
            role="presentation"
            aria-hidden="true"
            data-orientation="horizontal"
            onPointerDown={onScrollHandlePointerDown}
            style={{ left: `${String(thumb.offset)}%`, width: `${String(thumb.size)}%` }}
            className={styles["stripScrollHandle"]}
          />
        ) : null}
      </div>
    </StripContext>
  );
};
