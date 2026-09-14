import { useMemo, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { SplitChildState, SplitContextValue, SplitDropIndicator, SplitLeafHandlers, SplitRootLeafState, SplitState, TabSplitProps, TabTreeLeaf, TabTreeNode, TabTreeSplit } from './Split';
import type { SplitDropPosition, TabDropZone } from './shared';

// ─────────────────────────── 계산 ───────────────────────────

const clampNormalized = (size: number): number => Math.min(80, Math.max(10, size));
/** 10~90%로 가둔다 — 한쪽이 사라져 되돌릴 수 없게 되는 것을 막는다. 소수점 둘째 자리까지. */
export const clampSize = (size: number): number => Math.min(90, Math.max(10, Number(size.toFixed(2))));

/** 합이 100이 되도록 다시 나눈다 — `size`가 없는 자식은 균등분으로 시작한다. */
export const normalizeSizes = (nodes: readonly TabTreeNode[]): number[] => {
  if (nodes.length === 0) return [];

  const fallback = 100 / nodes.length;
  const sizes = nodes.map((node) => clampNormalized(node.size ?? fallback));
  const total = sizes.reduce((sum, size) => sum + size, 0);

  return sizes.map((size) => Number(((size / total) * 100).toFixed(4)));
};

/** `onNodeResize`가 없거나 자식이 하나면 크기 조절이 꺼진다. */
export const getSplitState = (node: TabTreeSplit, onNodeResize?: TabSplitProps['onNodeResize']): SplitState => ({
  orientation: node.orientation,
  sizes: normalizeSizes(node.children),
  disabledResize: !onNodeResize || node.children.length < 2,
});

/** 빈 leaf를 걷어내고, 자식이 하나만 남은 split은 그 자식으로 대체한다. 전부 사라지면 `null`. */
export const pruneVisibleTree = (node: TabTreeNode): TabTreeNode | null => {
  if (node.kind === 'leaf') return node.tabItems.length > 0 ? node : null;

  const survivors = node.children.map((child) => pruneVisibleTree(child)).filter((child): child is TabTreeNode => child !== null);

  if (survivors.length === 0) return null;
  if (survivors.length === 1) {
    const only = survivors[0]!;
    return only.kind === 'leaf' ? { ...only, size: node.size } : { ...only, size: node.size };
  }
  return { ...node, children: survivors };
};

// 좌/우가 우선 — 전체 높이의 양옆 22%(모서리 포함)는 항상 left/right, 가운데 폭 안에서만 상하 22%를 본다.
/** 가장자리 22%를 방향으로, 가운데는 `center`(합치기)로 읽는다. 좌·우가 상·하보다 우선이다. */
export const getSplitDropPosition = (event: DragEvent<HTMLElement>, rect: DOMRect): SplitDropPosition => {
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const edge = 0.22;

  if (x <= edge) return 'left';
  if (x >= 1 - edge) return 'right';
  if (y <= edge) return 'top';
  if (y >= 1 - edge) return 'bottom';
  return 'center';
};

const getLeafPanelRect = (sectionEl: HTMLElement): DOMRect =>
  sectionEl.querySelector<HTMLElement>('[role="tabpanel"]')?.getBoundingClientRect() ?? sectionEl.getBoundingClientRect();

/** 드롭 대상이 탭 목록 안이면 `strip`, 아니면 `panel`이다 — DOM 조상을 거슬러 판단한다. */
export const getLeafDropZone = (event: DragEvent<HTMLElement>): TabDropZone =>
  event.target instanceof HTMLElement && event.target.closest('[role="tablist"]') ? 'strip' : 'panel';

const getTransferValue = (event: DragEvent<HTMLElement>, key: string): string => {
  try {
    return event.dataTransfer.getData(key);
  } catch {
    return '';
  }
};

/** leaf 하나의 drag/drop 핸들러 — branch 자식과 트리가 leaf 하나뿐인 루트 양쪽에서 재사용한다. */
export const createLeafDragHandlers = (leafId: string, activeTabId: string, shared: SplitContextValue): SplitLeafHandlers => ({
  onDragStart: (event) => {
    const draggedId = getTransferValue(event, 'text/plain') || activeTabId;
    shared.dragSourceRef.current = { leafId, tabId: draggedId };
    event.dataTransfer.setData('application/x-arka-source-leaf', leafId);
    event.dataTransfer.setData('application/x-arka-tab-id', draggedId);
  },
  onDragOver: (event) => {
    const zone = getLeafDropZone(event);
    const sameLeaf = shared.dragSourceRef.current?.leafId === leafId;

    if (zone === 'strip') {
      if (sameLeaf) {
        shared.setDropIndicator((current) => (current?.leafId === leafId ? null : current));
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      shared.setDropIndicator({ leafId, zone: 'strip' });
      return;
    }

    const position = getSplitDropPosition(event, getLeafPanelRect(event.currentTarget));
    if (position === 'center' && sameLeaf) {
      shared.setDropIndicator((current) => (current?.leafId === leafId ? null : current));
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    shared.setDropIndicator({ leafId, zone: 'panel', position });
  },
  onDragLeave: (event) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    shared.setDropIndicator((current) => (current?.leafId === leafId ? null : current));
  },
  onDropCapture: (event) => {
    const zone = getLeafDropZone(event);
    const sourceLeafId = getTransferValue(event, 'application/x-arka-source-leaf') || shared.dragSourceRef.current?.leafId;
    const droppedId =
      getTransferValue(event, 'application/x-arka-tab-id') ||
      getTransferValue(event, 'text/plain') ||
      shared.dragSourceRef.current?.tabId;

    if (!sourceLeafId || !droppedId) return;

    if (zone === 'strip') {
      if (sourceLeafId === leafId) return;
      event.preventDefault();
      event.stopPropagation();
      shared.onTabMove?.(sourceLeafId, leafId, droppedId);
      shared.dragSourceRef.current = null;
      shared.setDropIndicator(null);
      return;
    }

    const position = getSplitDropPosition(event, getLeafPanelRect(event.currentTarget));
    if (position === 'center' && sourceLeafId === leafId) return;

    event.preventDefault();
    event.stopPropagation();
    if (position !== 'center') {
      shared.onTabSplit?.(sourceLeafId, droppedId, position);
    } else {
      shared.onTabMove?.(sourceLeafId, leafId, droppedId);
    }
    shared.dragSourceRef.current = null;
    shared.setDropIndicator(null);
  },
  onDragEnd: () => {
    shared.dragSourceRef.current = null;
    shared.setDropIndicator(null);
  },
});

// ─────────────────────────── 상태 ───────────────────────────

/**
 * Split 트리 전체가 공유하는 상태(`dragSourceRef`/`dropIndicator`/`resizingChildId`/
 * `visibleHandleChildId`) — 전부 진짜 상태라 렌더링 쪽(`Tab.tsx`)에 둘 수 없다.
 */
export const useTabSplit = (props: TabSplitProps) => {
  const visibleTree = useMemo(() => pruneVisibleTree(props.tree) ?? props.tree, [props.tree]);
  const dragSourceRef = useRef<{ leafId: string; tabId: string } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<SplitDropIndicator | null>(null);
  const [resizingChildId, setResizingChildId] = useState<string | null>(null);
  const [visibleHandleChildId, setVisibleHandleChildId] = useState<string | null>(null);

  const context: SplitContextValue = {
    visibleTree,
    activeLeaf: props.activeLeaf,
    onTabClick: props.onTabClick,
    onMenuClick: props.onMenuClick,
    onTabClose: props.onTabClose,
    onTabReorder: props.onTabReorder,
    onTabMove: props.onTabMove,
    onTabSplit: props.onTabSplit,
    onNodeResize: props.onNodeResize,
    dragSourceRef,
    dropIndicator,
    setDropIndicator,
    resizingChildId,
    setResizingChildId,
    visibleHandleChildId,
    setVisibleHandleChildId,
  };

  return { visibleTree, context };
};

/** 트리 전체가 leaf 하나뿐일 때(아직 split된 적 없음)의 루트 상태 — 가장자리 드롭으로 최초 split을 시작한다. */
export const getRootLeafState = (leaf: TabTreeLeaf, shared: SplitContextValue): SplitRootLeafState => {
  const indicator = shared.dropIndicator?.leafId === leaf.id ? shared.dropIndicator : null;

  return {
    node: leaf,
    isActive: shared.activeLeaf === leaf.id,
    dropZone: indicator?.zone ?? null,
    dropPosition: indicator?.zone === 'panel' ? indicator.position : null,
    handlers: createLeafDragHandlers(leaf.id, leaf.activeTab, shared),
  };
};

/** branch 하나의 resize 상태 — `onPointerDown`이 `window` 리스너를 붙였다 떼는 진짜 로직이다. */
export const useSplitBranch = (node: TabTreeSplit, shared: SplitContextValue) => {
  const branchRef = useRef<HTMLElement | null>(null);
  const state = getSplitState(node, shared.onNodeResize);
  const cumulativeSizes = useMemo(
    () => state.sizes.map((_, index) => state.sizes.slice(0, index).reduce((sum, size) => sum + size, 0)),
    [state.sizes],
  );

  const updateChildSize = (childId: string, index: number, clientX: number, clientY: number) => {
    const branchElement = branchRef.current;
    if (!branchElement || !shared.onNodeResize) return;

    const rect = branchElement.getBoundingClientRect();
    const pointerPercent =
      state.orientation === 'horizontal' ? ((clientX - rect.left) / rect.width) * 100 : ((clientY - rect.top) / rect.height) * 100;
    shared.onNodeResize(node.id, childId, clampSize(pointerPercent - (cumulativeSizes[index] ?? 0)));
  };

  const startResize = (event: ReactPointerEvent<HTMLElement>, childId: string, index: number) => {
    if (!shared.onNodeResize) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    shared.setResizingChildId(childId);
    updateChildSize(childId, index, event.clientX, event.clientY);

    const onMove = (moveEvent: globalThis.PointerEvent) => updateChildSize(childId, index, moveEvent.clientX, moveEvent.clientY);
    const onEnd = () => {
      shared.setResizingChildId(null);
      shared.setVisibleHandleChildId(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd, { once: true });
  };

  const resizeByKeyboard = (event: ReactKeyboardEvent<HTMLElement>, childId: string, index: number) => {
    if (!shared.onNodeResize) return;
    const decrementKey = state.orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    const incrementKey = state.orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    if (event.key !== decrementKey && event.key !== incrementKey) return;

    event.preventDefault();
    const delta = event.key === incrementKey ? 5 : -5;
    shared.onNodeResize(node.id, childId, clampSize((state.sizes[index] ?? 0) + delta));
  };

  const getChildState = (child: TabTreeNode, index: number): SplitChildState => {
    const isLeaf = child.kind === 'leaf';
    const indicator = isLeaf && shared.dropIndicator?.leafId === child.id ? shared.dropIndicator : null;

    return {
      node: child,
      index,
      isLast: index === node.children.length - 1,
      orientation: state.orientation,
      isActive: isLeaf && shared.activeLeaf === child.id,
      dropZone: indicator?.zone ?? null,
      dropPosition: indicator?.zone === 'panel' ? indicator.position : null,
      isResizing: shared.resizingChildId === child.id,
      isHandleVisible: shared.visibleHandleChildId === child.id || shared.resizingChildId === child.id,
      style: { flexBasis: `${state.sizes[index] ?? 0}%`, flexGrow: 0, flexShrink: 0 },
      handlers: isLeaf ? createLeafDragHandlers(child.id, (child as TabTreeLeaf).activeTab, shared) : undefined,
      resizeHandlers: {
        onPointerEnter: () => shared.setVisibleHandleChildId(child.id),
        onPointerLeave: () =>
          shared.setVisibleHandleChildId((current) => (current === child.id && shared.resizingChildId !== child.id ? null : current)),
        onFocus: () => shared.setVisibleHandleChildId(child.id),
        onBlur: () =>
          shared.setVisibleHandleChildId((current) => (current === child.id && shared.resizingChildId !== child.id ? null : current)),
        onPointerDown: (event) => startResize(event, child.id, index),
        onKeyDown: (event) => resizeByKeyboard(event, child.id, index),
      },
    };
  };

  const branchState = {
    ref: branchRef,
    orientation: state.orientation,
    disabledResize: state.disabledResize,
    childStates: node.children.map((child, index) => getChildState(child, index)),
  };

  return branchState;
};
