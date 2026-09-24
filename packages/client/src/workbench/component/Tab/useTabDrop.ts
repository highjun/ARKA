import { useRef, useState } from "react";
import type { DragEvent, DragEventHandler } from "react";
import type { GroupId, SplitEdge, TabGroup, TabId, TabTree } from "./shared";

const EDGE_BAND = 0.22;

/** 놓으면 무슨 일이 일어나는지. 가장자리면 쪼개기, `"center"`면 그 칸으로 옮기기. */
export type DropTarget = SplitEdge | "center";

export interface GroupDropIndicator {
  readonly groupId: GroupId;
  readonly target: DropTarget;
}

/** 탭에서 올라오는 드래그를 잡으려고 Group 에 붙는다. */
export interface GroupSourceHandlers {
  readonly onDragStart: DragEventHandler<HTMLElement>;
  readonly onDragEnd: DragEventHandler<HTMLElement>;
}

/** 놓을 자리를 재려고 Panel 에 붙는다 — 가장자리 22%는 Panel 사각형 기준이다. */
export interface PanelDropHandlers {
  readonly onDragOver: DragEventHandler<HTMLElement>;
  readonly onDragLeave: DragEventHandler<HTMLElement>;
  readonly onDropCapture: DragEventHandler<HTMLElement>;
}

export type TabDropSplit = (groupId: GroupId, itemId: TabId, edge: SplitEdge) => void;
export type TabDropMove = (groupId: GroupId, itemId: TabId, beforeItemId: TabId | null) => void;

const getDropTarget = (event: DragEvent<HTMLElement>): DropTarget | null => {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  if (x <= EDGE_BAND) return "left";
  if (x >= 1 - EDGE_BAND) return "right";
  if (y <= EDGE_BAND) return "top";
  if (y >= 1 - EDGE_BAND) return "bottom";
  return "center";
};

const getTransferValue = (event: DragEvent<HTMLElement>, key: string): string => {
  try {
    return event.dataTransfer.getData(key);
  } catch {
    return "";
  }
};

/** 칸 사이에 걸친 드래그를 든다 — 어느 칸에서 끌어왔고 지금 어디에 놓으려는지. */
export const useTabDrop = ({
  onGroupSplit,
  onItemMove,
}: {
  readonly onGroupSplit?: TabDropSplit;
  readonly onItemMove?: TabDropMove;
}) => {
  const sourceRef = useRef<{ groupId: GroupId; itemId: TabId } | null>(null);
  const [indicator, setIndicator] = useState<GroupDropIndicator | null>(null);

  const clear = () => {
    sourceRef.current = null;
    setIndicator(null);
  };

  /** 이 칸에 놓을 수 있는가. 가운데는 **다른 칸에서 온 탭**만 받는다 — 제 칸이면 이미 거기 있다. */
  const accepts = (group: TabGroup, target: DropTarget): boolean =>
    target === "center"
      ? onItemMove !== undefined && sourceRef.current !== null && sourceRef.current.groupId !== group.id
      : onGroupSplit !== undefined;

  const sourceHandlersFor = (group: TabGroup): GroupSourceHandlers => ({
    onDragStart: (event) => {
      const itemId = getTransferValue(event, "text/plain") || group.activeItemId || "";
      sourceRef.current = { groupId: group.id, itemId };
      event.dataTransfer.setData("application/x-arka-tab-id", itemId);
    },
    onDragEnd: clear,
  });

  const dropHandlersFor = (group: TabGroup): PanelDropHandlers => {
    const clearOwn = () => setIndicator((current) => (current?.groupId === group.id ? null : current));

    return {
      onDragOver: (event) => {
        const target = getDropTarget(event);
        if (target === null || !accepts(group, target)) return clearOwn();

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setIndicator({ groupId: group.id, target });
      },
      onDragLeave: (event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        clearOwn();
      },
      onDropCapture: (event) => {
        const target = getDropTarget(event);
        if (target === null || !accepts(group, target)) return;

        const itemId =
          getTransferValue(event, "application/x-arka-tab-id") ||
          getTransferValue(event, "text/plain") ||
          sourceRef.current?.itemId;
        if (!itemId) return;

        event.preventDefault();
        event.stopPropagation();
        // 알리는 것은 **놓은 칸**이다. 탭이 어디서 왔는지는 받는 쪽이 안다.
        if (target === "center") onItemMove?.(group.id, itemId, null);
        else onGroupSplit?.(group.id, itemId, target);
        clear();
      },
    };
  };

  return { indicator, sourceHandlersFor, dropHandlersFor };
};

/** 탭이 하나도 없는 칸은 그리기 전에 잘라낸다 — 빈 칸이 화면을 차지하지 않게. */
export const pruneTree = (node: TabTree): TabTree | null => {
  if (node.kind === "group") return node.items.length > 0 ? node : null;

  const survivors = node.children.map(pruneTree).filter((child): child is TabTree => child !== null);

  if (survivors.length === 0) return null;
  if (survivors.length === 1) return { ...survivors[0]!, size: node.size };
  return { ...node, children: survivors };
};

/** 트리에서 가장 먼저 나오는 칸 — 활성 칸을 안 주었을 때의 기본값이다. */
export const firstGroupId = (node: TabTree): GroupId =>
  node.kind === "group" ? node.id : firstGroupId(node.children[0]!);

/** 트리 안에 그 칸이 살아 있는지 — 탭이 닫혀 칸이 사라졌을 때 되돌리는 자리다. */
export const hasGroup = (node: TabTree, groupId: GroupId): boolean =>
  node.kind === "group" ? node.id === groupId : node.children.some((child) => hasGroup(child, groupId));
