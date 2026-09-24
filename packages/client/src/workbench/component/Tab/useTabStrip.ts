import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEventHandler, ReactNode, RefObject } from "react";
import type { StripContextValue, StripDropIndicator, StripItemMove, StripItemState, StripListHandlers } from "./Strip";
import type { StripDropPosition, TabId, TabItem } from "./shared";

/**
 * 끌고 온 탭을 뺀 목록에서 "어느 탭 앞에" 꽂을지 고른다.
 * 번호가 아니라 탭 id 로 가리켜야 탭을 빼도 자리가 흔들리지 않는다.
 * 맨 뒤면 `null`.
 */
const beforeIdOf = (
  items: readonly TabItem[],
  fromId: TabId,
  targetId: TabId,
  position: StripDropPosition,
): TabId | null | undefined => {
  if (targetId === fromId) return undefined;
  const rest = items.filter((item) => item.id !== fromId);
  const index = rest.findIndex((item) => item.id === targetId);
  if (index < 0) return undefined;
  return position === "before" ? targetId : (rest[index + 1]?.id ?? null);
};

const getNearestGapPosition = (
  clientX: number,
  itemRects: readonly { id: TabId; rect: DOMRect }[],
): StripDropIndicator | null => {
  if (itemRects.length === 0) return null;
  for (const { id, rect } of itemRects) {
    if (clientX < rect.left + rect.width / 2) return { targetId: id, position: "before" };
  }
  const last = itemRects[itemRects.length - 1]!;
  return { targetId: last.id, position: "after" };
};

const getStripChildRects = (container: HTMLDivElement): { id: TabId; rect: DOMRect }[] =>
  Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]'))
    .map((element) => ({ id: element.dataset.tabId ?? "", rect: element.getBoundingClientRect() }))
    .filter((entry) => entry.id.length > 0);

const POINTER_DRAG_THRESHOLD_PX = 6;

const commitDrop = (
  items: readonly TabItem[],
  fromId: TabId,
  indicator: StripDropIndicator | null,
  onItemMove?: StripItemMove,
): void => {
  if (!fromId || !indicator) return;
  const beforeId = beforeIdOf(items, fromId, indicator.targetId, indicator.position);
  if (beforeId === undefined) return;
  onItemMove?.(fromId, beforeId);
};

const createStripKeyDown =
  (context: Omit<StripContextValue, "onKeyDown">) => (event: KeyboardEvent<HTMLDivElement>, item: TabItem) => {
    const currentIndex = context.items.findIndex((candidate) => candidate.id === item.id);
    if (currentIndex < 0) return;

    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;

      if (event.shiftKey && context.movable) {
        // 한 칸 옮긴 자리를, 옮길 탭을 뺀 목록에서 가리킨다.
        const rest = context.items.filter((candidate) => candidate.id !== item.id);
        if (direction === -1 && currentIndex === 0) return;
        const beforeId = (direction === 1 ? rest[currentIndex + 1] : rest[currentIndex - 1])?.id ?? null;
        context.onItemMove?.(item.id, beforeId);
        return;
      }

      const nextIndex = (currentIndex + direction + context.items.length) % context.items.length;
      context.onItemSelect?.(context.items[nextIndex]!.id);
    }
  };

export const useTabStrip = ({
  items,
  activeItemId,
  onItemSelect,
  onItemClose,
  onItemMove,
  onItemPin,
  renderItemMenu,
}: {
  readonly items: readonly TabItem[];
  readonly activeItemId: TabId | null;
  readonly onItemSelect?: (itemId: TabId) => void;
  readonly onItemClose?: (itemId: TabId) => void;
  readonly onItemMove?: StripItemMove;
  readonly onItemPin?: (itemId: TabId) => void;
  readonly renderItemMenu?: (itemId: TabId) => ReactNode;
}) => {
  const movable = Boolean(onItemMove);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [dropIndicator, setDropIndicator] = useState<StripDropIndicator | null>(null);
  const [draggingId, setDraggingId] = useState<TabId | null>(null);

  const contextBase = {
    items,
    activeItemId,
    movable,
    onItemSelect,
    onItemClose,
    onItemMove,
    onItemPin,
    renderItemMenu,
    dropIndicator,
    setDropIndicator,
    draggingId,
    setDraggingId,
    listRef,
  };

  const context = { ...contextBase, onKeyDown: createStripKeyDown(contextBase) };

  const listHandlers: StripListHandlers = {
    onDragOver: (event) => {
      if (!movable) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const container = listRef.current;
      setDropIndicator(container ? getNearestGapPosition(event.clientX, getStripChildRects(container)) : null);
    },
    onDragLeave: (event) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      setDropIndicator(null);
    },
    onDrop: (event) => {
      if (!movable) return;
      event.preventDefault();
      const fromId = event.dataTransfer.getData("text/plain");
      const container = listRef.current;
      const indicator = container ? getNearestGapPosition(event.clientX, getStripChildRects(container)) : null;
      setDropIndicator(null);
      setDraggingId(null);
      commitDrop(items, fromId, indicator, onItemMove);
    },
  };

  return { context, listRef, listHandlers };
};

/** 띠의 스크롤 엄지. 띠 폭에 대한 비율(%)이라 CSS가 그대로 쓴다. */
export interface StripScrollThumb {
  readonly isOverflowing: boolean;
  readonly offset: number;
  readonly size: number;
}

const NO_THUMB: StripScrollThumb = { isOverflowing: false, offset: 0, size: 0 };

export const useStripScrollHandle = (viewportRef: RefObject<HTMLDivElement | null>) => {
  const [thumb, setThumb] = useState<StripScrollThumb>(NO_THUMB);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const { scrollWidth, clientWidth, scrollLeft } = viewport;
      setThumb(
        scrollWidth > clientWidth
          ? {
              isOverflowing: true,
              offset: (scrollLeft / scrollWidth) * 100,
              size: (clientWidth / scrollWidth) * 100,
            }
          : NO_THUMB,
      );
    };

    /** 세로 휠도 띠를 가로로 민다 — 보통 마우스엔 가로 휠이 없다. */
    const onWheel = (event: globalThis.WheelEvent) => {
      if (event.deltaX !== 0 || event.deltaY === 0) return;
      if (viewport.scrollWidth <= viewport.clientWidth) return;
      event.preventDefault();
      viewport.scrollLeft += event.deltaY;
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    viewport.addEventListener("scroll", measure, { passive: true });
    viewport.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", measure);
      viewport.removeEventListener("wheel", onWheel);
    };
  }, [viewportRef]);

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    const startX = event.clientX;
    const startScrollLeft = viewport.scrollLeft;
    // 엄지가 1px 가면 내용은 (전체 폭 / 보이는 폭) 배로 간다 — 그래야 손끝을 따라온다.
    const ratio = viewport.clientWidth === 0 ? 1 : viewport.scrollWidth / viewport.clientWidth;

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      viewport.scrollLeft = startScrollLeft + (moveEvent.clientX - startX) * ratio;
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    const onUp = () => cleanup();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
  };

  return { thumb, onPointerDown };
};

export const getStripItemStates = (context: StripContextValue): StripItemState[] =>
  context.items.map((item) => {
    const isDraggable = context.movable;
    const indicatorPosition = context.dropIndicator?.targetId === item.id ? context.dropIndicator.position : null;
    const { onItemClose } = context;

    return {
      item,
      isActive: item.id === context.activeItemId,
      isDraggable,
      isDragging: context.draggingId === item.id,
      indicatorPosition,
      onItemSelect: () => context.onItemSelect?.(item.id),
      onItemClose: onItemClose === undefined ? undefined : () => onItemClose(item.id),
      handlers: {
        draggable: isDraggable,
        onDoubleClick: () => {
          if (item.isPreview) context.onItemPin?.(item.id);
        },
        onDragStart: (event) => {
          if (!isDraggable) return;
          context.setDraggingId(item.id);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.id);
          event.dataTransfer.setData("application/x-arka-tab-id", item.id);
        },
        onDragEnd: () => {
          context.setDraggingId(null);
          context.setDropIndicator(null);
        },
        onPointerDown: (event) => {
          if (!isDraggable) return;
          if ((event.target as HTMLElement).closest("button")) return;
          if (event.pointerType === "mouse" && event.button !== 0) return;

          const target = event.currentTarget;
          target.setPointerCapture?.(event.pointerId);

          const startX = event.clientX;
          const startY = event.clientY;
          let dragStarted = false;

          const readIndicator = (clientX: number) => {
            const container = context.listRef.current;
            return container ? getNearestGapPosition(clientX, getStripChildRects(container)) : null;
          };

          const cleanup = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onCancel);
          };

          const onMove = (moveEvent: globalThis.PointerEvent) => {
            if (!dragStarted) {
              const dx = moveEvent.clientX - startX;
              const dy = (moveEvent.clientY ?? startY) - startY;
              if (Math.hypot(dx, dy) < POINTER_DRAG_THRESHOLD_PX) return;
              dragStarted = true;
              context.setDraggingId(item.id);
            }
            context.setDropIndicator(readIndicator(moveEvent.clientX));
          };

          const onUp = (upEvent: globalThis.PointerEvent) => {
            cleanup();
            if (!dragStarted) return;
            const indicator = readIndicator(upEvent.clientX);
            context.setDropIndicator(null);
            context.setDraggingId(null);
            commitDrop(context.items, item.id, indicator, context.onItemMove);
          };

          const onCancel = () => {
            cleanup();
            if (!dragStarted) return;
            context.setDropIndicator(null);
            context.setDraggingId(null);
          };

          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp, { once: true });
          window.addEventListener("pointercancel", onCancel, { once: true });
        },
        onKeyDown: (event) => {
          context.onKeyDown(event, item);
          if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            context.onItemSelect?.(item.id);
          }
        },
      },
    };
  });
