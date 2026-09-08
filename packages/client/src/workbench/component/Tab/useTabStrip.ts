import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEventHandler, ReactNode, RefObject } from 'react';
import type { StripContextValue, StripDropIndicator, StripDropPosition, StripItemState, StripListHandlers, TabId, TabItem } from './Tab';

export const reorder = (tabItems: readonly TabItem[], itemId: string, direction: -1 | 1): readonly TabItem[] => {
  const index = tabItems.findIndex((tab) => tab.id === itemId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= tabItems.length) return tabItems;

  const next = [...tabItems];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item!);
  return next;
};

export const reorderByDrop = (
  tabItems: readonly TabItem[],
  fromId: string,
  targetId: string,
  position: StripDropPosition,
): readonly TabItem[] => {
  const fromIndex = tabItems.findIndex((tab) => tab.id === fromId);
  const targetIndex = tabItems.findIndex((tab) => tab.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return tabItems;

  const next = [...tabItems];
  const [item] = next.splice(fromIndex, 1);
  const targetIndexAfterRemoval = next.findIndex((tab) => tab.id === targetId);
  const insertIndex = position === 'before' ? targetIndexAfterRemoval : targetIndexAfterRemoval + 1;
  next.splice(insertIndex, 0, item!);

  const changed = next.some((tab, index) => tab.id !== tabItems[index]?.id);
  return changed ? next : tabItems;
};

/** 어떤 탭의 중점보다도 왼쪽이면 그 탭 앞(`before`), 다 지나쳤으면 마지막 탭 뒤(`after`). */
export const getNearestGapPosition = (
  clientX: number,
  tabRects: readonly { id: string; rect: DOMRect }[],
): StripDropIndicator | null => {
  if (tabRects.length === 0) return null;
  for (const { id, rect } of tabRects) {
    if (clientX < rect.left + rect.width / 2) return { targetId: id, position: 'before' };
  }
  const last = tabRects[tabRects.length - 1]!;
  return { targetId: last.id, position: 'after' };
};

export const getStripChildRects = (container: HTMLDivElement): { id: string; rect: DOMRect }[] =>
  Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]'))
    .map((tab) => ({ id: tab.dataset.tabId ?? '', rect: tab.getBoundingClientRect() }))
    .filter((entry) => entry.id.length > 0);

/** 클릭과 포인터 재정렬을 가르는 최소 이동 거리(px) — 6px는 브라우저 네이티브 DnD/터치 슬롭 관행값. */
export const POINTER_DRAG_THRESHOLD_PX = 6;

export const commitReorder = (
  tabItems: readonly TabItem[],
  fromId: string,
  indicator: StripDropIndicator | null,
  onTabReorder?: (nextItems: TabItem[]) => void,
): void => {
  if (!fromId || !indicator) return;
  const nextItems = reorderByDrop(tabItems, fromId, indicator.targetId, indicator.position);
  if (nextItems !== tabItems) onTabReorder?.([...nextItems]);
};

export const createStripKeyDown =
  (context: Omit<StripContextValue, 'onKeyDown'>) => (event: KeyboardEvent<HTMLDivElement>, item: TabItem) => {
    const currentIndex = context.tabItems.findIndex((tab) => tab.id === item.id);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;

      if (event.shiftKey && context.reorderable) {
        const nextItems = reorder(context.tabItems, item.id, direction);
        if (nextItems !== context.tabItems) context.onTabReorder?.([...nextItems]);
        return;
      }

      const nextIndex = (currentIndex + direction + context.tabItems.length) % context.tabItems.length;
      context.onTabClick(context.tabItems[nextIndex]!.id);
    }
  };

/**
 * `draggingId`/`dropIndicator`가 진짜 상태(`useState`)라 렌더링 쪽(`Tab.tsx`)에 둘 수 없다. Context
 * 값과 tab-list 컨테이너 핸들러를 반환한다.
 */
export const useTabStrip = (
  activeTab: TabId,
  tabItems: readonly TabItem[],
  onTabClick: (tabId: TabId) => void,
  onMenuClick: () => void,
  onTabClose: ((tabId: TabId) => void) | undefined,
  onTabReorder: ((nextItems: TabItem[]) => void) | undefined,
  onTabPin: ((tabId: TabId) => void) | undefined,
  renderTabContextMenu: ((tab: TabItem) => ReactNode) | undefined,
) => {
  const reorderable = Boolean(onTabReorder);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [dropIndicator, setDropIndicator] = useState<StripDropIndicator | null>(null);
  const [draggingId, setDraggingId] = useState<TabId | null>(null);

  const contextBase = {
    activeTab,
    tabItems,
    reorderable,
    onTabClick,
    onMenuClick,
    onTabClose,
    onTabReorder,
    onTabPin,
    renderTabContextMenu,
    dropIndicator,
    setDropIndicator,
    draggingId,
    setDraggingId,
    listRef,
  };

  const context = { ...contextBase, onKeyDown: createStripKeyDown(contextBase) };

  const listHandlers: StripListHandlers = {
    onDragOver: (event) => {
      if (!reorderable) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const container = listRef.current;
      setDropIndicator(container ? getNearestGapPosition(event.clientX, getStripChildRects(container)) : null);
    },
    onDragLeave: (event) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      setDropIndicator(null);
    },
    onDrop: (event) => {
      if (!reorderable) return;
      event.preventDefault();
      const fromId = event.dataTransfer.getData('text/plain');
      const container = listRef.current;
      const indicator = container ? getNearestGapPosition(event.clientX, getStripChildRects(container)) : null;
      setDropIndicator(null);
      setDraggingId(null);
      commitReorder(tabItems, fromId, indicator, onTabReorder);
    },
  };

  return { context, listRef, listHandlers };
};

/**
 * 탭 스트립을 옆으로 잡아끌어 스크롤하는 pill 핸들 — `Tab.Split`의 `ResizeHandle`과 같은 시각
 * 패턴(경계에 뜨는 작은 pill)을 가로 스크롤에도 준다. 탭 재정렬 드래그(`getStripItemStates`의
 * `onPointerDown`)와는 히트 영역이 아예 다른 별도 엘리먼트라 제스처가 겹치지 않는다.
 *
 * `viewportRef`는 `Container`(Radix `ScrollAreaViewport`)에 그대로 꽂은 ref다 — 스크롤 위치를
 * 읽고 쓰는 대상은 항상 그 Viewport 자신이다(Container 자체 문서 참고).
 */
export const useStripScrollHandle = (viewportRef: RefObject<HTMLDivElement | null>) => {
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => setIsOverflowing(viewport.scrollWidth > viewport.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [viewportRef]);

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture?.(pointerId);
    const startX = event.clientX;
    const startScrollLeft = viewport.scrollLeft;

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      viewport.scrollLeft = startScrollLeft + (moveEvent.clientX - startX);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    const onUp = () => cleanup();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
  };

  return { isOverflowing, onPointerDown };
};

/** 탭 하나의 클릭/드래그/키보드 인터랙션 props — 순수 함수가 아니라 컨텍스트의 setState를 클로저로 문다. */
export const getStripItemStates = (context: StripContextValue): StripItemState[] =>
  context.tabItems.map((tab) => {
    const isDraggable = context.reorderable;
    const indicatorPosition = context.dropIndicator?.targetId === tab.id ? context.dropIndicator.position : null;

    return {
      tab,
      isActive: tab.id === context.activeTab,
      isDraggable,
      isDragging: context.draggingId === tab.id,
      indicatorPosition,
      onClose: () => context.onTabClose?.(tab.id),
      handlers: {
        draggable: isDraggable,
        onClick: () => context.onTabClick(tab.id),
        onDoubleClick: () => {
          if (tab.isPreview) context.onTabPin?.(tab.id);
        },
        onDragStart: (event) => {
          if (!isDraggable) return;
          context.setDraggingId(tab.id);
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', tab.id);
          event.dataTransfer.setData('application/x-arka-tab-id', tab.id);
        },
        onDragEnd: () => {
          context.setDraggingId(null);
          context.setDropIndicator(null);
        },
        onPointerDown: (event) => {
          if (!isDraggable) return;
          if ((event.target as HTMLElement).closest('button')) return;
          if (event.pointerType === 'mouse' && event.button !== 0) return;

          const pointerId = event.pointerId;
          const target = event.currentTarget;
          target.setPointerCapture?.(pointerId);

          const startX = event.clientX;
          const startY = event.clientY;
          let dragStarted = false;

          const readIndicator = (clientX: number) => {
            const container = context.listRef.current;
            return container ? getNearestGapPosition(clientX, getStripChildRects(container)) : null;
          };

          const cleanup = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
          };

          const onMove = (moveEvent: globalThis.PointerEvent) => {
            if (!dragStarted) {
              const dx = moveEvent.clientX - startX;
              const dy = (moveEvent.clientY ?? startY) - startY;
              if (Math.hypot(dx, dy) < POINTER_DRAG_THRESHOLD_PX) return;
              dragStarted = true;
              context.setDraggingId(tab.id);
            }
            context.setDropIndicator(readIndicator(moveEvent.clientX));
          };

          const onUp = (upEvent: globalThis.PointerEvent) => {
            cleanup();
            if (!dragStarted) return;
            const indicator = readIndicator(upEvent.clientX);
            context.setDropIndicator(null);
            context.setDraggingId(null);
            commitReorder(context.tabItems, tab.id, indicator, context.onTabReorder);
          };

          const onCancel = () => {
            cleanup();
            if (!dragStarted) return;
            context.setDropIndicator(null);
            context.setDraggingId(null);
          };

          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp, { once: true });
          window.addEventListener('pointercancel', onCancel, { once: true });
        },
        onKeyDown: (event) => {
          context.onKeyDown(event, tab);
          if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            context.onTabClick(tab.id);
          }
        },
      },
    };
  });
