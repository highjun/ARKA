import { useMemo, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type {
  PaneId,
  SplitChildState,
  SplitContextValue,
  SplitDropIndicator,
  SplitLeafHandlers,
  SplitRootLeafState,
  SplitState,
  TabSplitProps,
} from "./Split";
import type { PaneRowLeaf, PaneRowNode, PaneRowSplit, SplitDropPosition, TabDropZone, TabId } from "./shared";

const clampNormalized = (size: number): number => Math.min(80, Math.max(10, size));
const clampSize = (size: number): number => Math.min(90, Math.max(10, Number(size.toFixed(2))));

const normalizeSizes = (nodes: readonly PaneRowNode[]): number[] => {
  if (nodes.length === 0) return [];

  const fallback = 100 / nodes.length;
  const sizes = nodes.map((node) => clampNormalized(node.size ?? fallback));
  const total = sizes.reduce((sum, size) => sum + size, 0);

  return sizes.map((size) => Number(((size / total) * 100).toFixed(4)));
};

const getSplitState = (node: PaneRowSplit, onResize?: TabSplitProps["onResize"]): SplitState => ({
  orientation: node.orientation,
  sizes: normalizeSizes(node.children),
  disabledResize: !onResize || node.children.length < 2,
});

const pruneVisibleTree = (node: PaneRowNode): PaneRowNode | null => {
  if (node.kind === "leaf") return node.tabs.length > 0 ? node : null;

  const survivors = node.children
    .map((child) => pruneVisibleTree(child))
    .filter((child): child is PaneRowNode => child !== null);

  if (survivors.length === 0) return null;
  if (survivors.length === 1) {
    const only = survivors[0]!;
    return only.kind === "leaf" ? { ...only, size: node.size } : { ...only, size: node.size };
  }
  return { ...node, children: survivors };
};

const getSplitDropPosition = (event: DragEvent<HTMLElement>, rect: DOMRect): SplitDropPosition => {
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const edge = 0.22;

  if (x <= edge) return "left";
  if (x >= 1 - edge) return "right";
  if (y <= edge) return "top";
  if (y >= 1 - edge) return "bottom";
  return "center";
};

const getLeafPanelRect = (sectionEl: HTMLElement): DOMRect =>
  sectionEl.querySelector<HTMLElement>('[role="tabpanel"]')?.getBoundingClientRect() ??
  sectionEl.getBoundingClientRect();

const getLeafDropZone = (event: DragEvent<HTMLElement>): TabDropZone =>
  event.target instanceof HTMLElement && event.target.closest('[role="tablist"]') ? "strip" : "panel";

const getTransferValue = (event: DragEvent<HTMLElement>, key: string): string => {
  try {
    return event.dataTransfer.getData(key);
  } catch {
    return "";
  }
};

const createLeafDragHandlers = (
  leafId: PaneId,
  activeTabId: TabId | null,
  shared: SplitContextValue,
): SplitLeafHandlers => ({
  onDragStart: (event) => {
    const draggedId = getTransferValue(event, "text/plain") || activeTabId || "";
    shared.dragSourceRef.current = { leafId, tabId: draggedId };
    event.dataTransfer.setData("application/x-arka-source-leaf", leafId);
    event.dataTransfer.setData("application/x-arka-tab-id", draggedId);
  },
  onDragOver: (event) => {
    const zone = getLeafDropZone(event);
    const sameLeaf = shared.dragSourceRef.current?.leafId === leafId;

    if (zone === "strip") {
      if (sameLeaf) {
        shared.setDropIndicator((current) => (current?.leafId === leafId ? null : current));
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      shared.setDropIndicator({ leafId, zone: "strip" });
      return;
    }

    const position = getSplitDropPosition(event, getLeafPanelRect(event.currentTarget));
    if (position === "center" && sameLeaf) {
      shared.setDropIndicator((current) => (current?.leafId === leafId ? null : current));
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    shared.setDropIndicator({ leafId, zone: "panel", position });
  },
  onDragLeave: (event) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    shared.setDropIndicator((current) => (current?.leafId === leafId ? null : current));
  },
  onDropCapture: (event) => {
    const zone = getLeafDropZone(event);
    const sourceLeafId =
      getTransferValue(event, "application/x-arka-source-leaf") || shared.dragSourceRef.current?.leafId;
    const droppedId =
      getTransferValue(event, "application/x-arka-tab-id") ||
      getTransferValue(event, "text/plain") ||
      shared.dragSourceRef.current?.tabId;

    if (!sourceLeafId || !droppedId) return;

    if (zone === "strip") {
      if (sourceLeafId === leafId) return;
      event.preventDefault();
      event.stopPropagation();
      shared.onMove?.(sourceLeafId, leafId, droppedId);
      shared.dragSourceRef.current = null;
      shared.setDropIndicator(null);
      return;
    }

    const position = getSplitDropPosition(event, getLeafPanelRect(event.currentTarget));
    if (position === "center" && sourceLeafId === leafId) return;

    event.preventDefault();
    event.stopPropagation();
    if (position !== "center") {
      shared.onSplit?.(sourceLeafId, droppedId, position);
    } else {
      shared.onMove?.(sourceLeafId, leafId, droppedId);
    }
    shared.dragSourceRef.current = null;
    shared.setDropIndicator(null);
  },
  onDragEnd: () => {
    shared.dragSourceRef.current = null;
    shared.setDropIndicator(null);
  },
});

export const useTabSplit = (
  props: Pick<TabSplitProps, "tree" | "activePaneId" | "onMove" | "onSplit" | "onResize">,
) => {
  const visibleTree = useMemo(() => pruneVisibleTree(props.tree) ?? props.tree, [props.tree]);
  const dragSourceRef = useRef<{ leafId: string; tabId: string } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<SplitDropIndicator | null>(null);
  const [resizingChildId, setResizingChildId] = useState<string | null>(null);
  const [visibleHandleChildId, setVisibleHandleChildId] = useState<string | null>(null);

  const context: SplitContextValue = {
    visibleTree,
    activePaneId: props.activePaneId,
    onMove: props.onMove,
    onSplit: props.onSplit,
    onResize: props.onResize,
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

export const getRootLeafState = (leaf: PaneRowLeaf, shared: SplitContextValue): SplitRootLeafState => {
  const indicator = shared.dropIndicator?.leafId === leaf.id ? shared.dropIndicator : null;

  return {
    node: leaf,
    isActive: shared.activePaneId === leaf.id,
    dropZone: indicator?.zone ?? null,
    dropPosition: indicator?.zone === "panel" ? indicator.position : null,
    handlers: createLeafDragHandlers(leaf.id, leaf.activeTabId, shared),
  };
};

export const useSplitBranch = (node: PaneRowSplit, shared: SplitContextValue) => {
  const branchRef = useRef<HTMLElement | null>(null);
  const state = getSplitState(node, shared.onResize);
  const cumulativeSizes = useMemo(
    () => state.sizes.map((_, index) => state.sizes.slice(0, index).reduce((sum, size) => sum + size, 0)),
    [state.sizes],
  );

  const updateChildSize = (childId: string, index: number, clientX: number, clientY: number) => {
    const branchElement = branchRef.current;
    if (!branchElement || !shared.onResize) return;

    const rect = branchElement.getBoundingClientRect();
    const pointerPercent =
      state.orientation === "horizontal"
        ? ((clientX - rect.left) / rect.width) * 100
        : ((clientY - rect.top) / rect.height) * 100;
    shared.onResize(node.id, childId, clampSize(pointerPercent - (cumulativeSizes[index] ?? 0)));
  };

  const startResize = (event: ReactPointerEvent<HTMLElement>, childId: string, index: number) => {
    if (!shared.onResize) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    shared.setResizingChildId(childId);
    updateChildSize(childId, index, event.clientX, event.clientY);

    const onMove = (moveEvent: globalThis.PointerEvent) =>
      updateChildSize(childId, index, moveEvent.clientX, moveEvent.clientY);
    const onEnd = () => {
      shared.setResizingChildId(null);
      shared.setVisibleHandleChildId(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
  };

  const resizeByKeyboard = (event: ReactKeyboardEvent<HTMLElement>, childId: string, index: number) => {
    if (!shared.onResize) return;
    const decrementKey = state.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const incrementKey = state.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    if (event.key !== decrementKey && event.key !== incrementKey) return;

    event.preventDefault();
    const delta = event.key === incrementKey ? 5 : -5;
    shared.onResize(node.id, childId, clampSize((state.sizes[index] ?? 0) + delta));
  };

  const getChildState = (child: PaneRowNode, index: number): SplitChildState => {
    const isLeaf = child.kind === "leaf";
    const indicator = isLeaf && shared.dropIndicator?.leafId === child.id ? shared.dropIndicator : null;

    return {
      node: child,
      index,
      isLast: index === node.children.length - 1,
      orientation: state.orientation,
      isActive: isLeaf && shared.activePaneId === child.id,
      dropZone: indicator?.zone ?? null,
      dropPosition: indicator?.zone === "panel" ? indicator.position : null,
      isResizing: shared.resizingChildId === child.id,
      isHandleVisible: shared.visibleHandleChildId === child.id || shared.resizingChildId === child.id,
      style: { flexBasis: `${state.sizes[index] ?? 0}%`, flexGrow: 0, flexShrink: 0 },
      handlers: isLeaf ? createLeafDragHandlers(child.id, (child as PaneRowLeaf).activeTabId, shared) : undefined,
      resizeHandlers: {
        onPointerEnter: () => shared.setVisibleHandleChildId(child.id),
        onPointerLeave: () =>
          shared.setVisibleHandleChildId((current) =>
            current === child.id && shared.resizingChildId !== child.id ? null : current,
          ),
        onFocus: () => shared.setVisibleHandleChildId(child.id),
        onBlur: () =>
          shared.setVisibleHandleChildId((current) =>
            current === child.id && shared.resizingChildId !== child.id ? null : current,
          ),
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
