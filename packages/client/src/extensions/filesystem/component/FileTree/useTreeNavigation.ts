import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { isApplePlatform } from "./shared";
import type { FileTreeItem, FileTreeItemId } from "./FileTree";

export interface FlatTreeNode {
  readonly item: FileTreeItem;
  readonly level: number;
  readonly parentId: FileTreeItemId | null;
}

export const flattenVisible = (
  items: readonly FileTreeItem[],
  expandedIds: ReadonlySet<FileTreeItemId>,
  level = 1,
  parentId: FileTreeItemId | null = null,
): FlatTreeNode[] => {
  const out: FlatTreeNode[] = [];
  for (const item of items) {
    out.push({ item, level, parentId });
    if (item.type === "folder" && expandedIds.has(item.id) && item.children) {
      out.push(...flattenVisible(item.children, expandedIds, level + 1, item.id));
    }
  }
  return out;
};

const isSelectAllEvent = (event: KeyboardEvent<HTMLElement>): boolean =>
  (isApplePlatform() ? event.metaKey : event.ctrlKey) && (event.key === "a" || event.key === "A");

export const useTreeNavigation = (
  items: readonly FileTreeItem[],
  expandedIds: ReadonlySet<FileTreeItemId>,
  initialFocusedId: FileTreeItemId | undefined,
  onToggleFolder: ((item: FileTreeItem, expanded: boolean) => void) | undefined,
  onActivateRow: (node: FlatTreeNode) => void,
  onExtendSelection: (node: FlatTreeNode) => void,
  onSelectAll: () => void,
  onFocusMoved: (id: FileTreeItemId) => void,
) => {
  const flat = useMemo(() => flattenVisible(items, expandedIds), [items, expandedIds]);
  const [focusedId, setFocusedId] = useState<FileTreeItemId | undefined>(initialFocusedId ?? flat[0]?.item.id);
  const nodesRef = useRef(new Map<FileTreeItemId, HTMLLIElement>());

  const registerNode = (id: FileTreeItemId) => (element: HTMLLIElement | null) => {
    if (element === null) nodesRef.current.delete(id);
    else nodesRef.current.set(id, element);
  };

  const focusIndex = flat.findIndex((node) => node.item.id === focusedId);
  const effectiveFocusedId = focusIndex >= 0 ? focusedId : flat[0]?.item.id;

  const focusNode = (id: FileTreeItemId | undefined) => {
    if (id === undefined) return;
    setFocusedId(id);
    nodesRef.current.get(id)?.focus();
  };

  const onRowKeyDown = (node: FlatTreeNode) => (event: KeyboardEvent<HTMLElement>) => {
    if (isSelectAllEvent(event)) {
      event.preventDefault();
      event.stopPropagation();
      onSelectAll();
      return;
    }

    const index = flat.findIndex((entry) => entry.item.id === node.item.id);

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        event.stopPropagation();
        const next = flat[index + 1];
        if (next === undefined) return;
        focusNode(next.item.id);
        if (event.shiftKey) onExtendSelection(next);
        else onFocusMoved(next.item.id);
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        event.stopPropagation();
        const prev = flat[index - 1];
        if (prev === undefined) return;
        focusNode(prev.item.id);
        if (event.shiftKey) onExtendSelection(prev);
        else onFocusMoved(prev.item.id);
        return;
      }
      case "Home": {
        event.preventDefault();
        event.stopPropagation();
        const first = flat[0];
        if (first === undefined) return;
        focusNode(first.item.id);
        onFocusMoved(first.item.id);
        return;
      }
      case "End": {
        event.preventDefault();
        event.stopPropagation();
        const last = flat[flat.length - 1];
        if (last === undefined) return;
        focusNode(last.item.id);
        onFocusMoved(last.item.id);
        return;
      }
      case "ArrowRight": {
        if (node.item.type !== "folder") return;
        event.preventDefault();
        event.stopPropagation();
        if (expandedIds.has(node.item.id)) {
          const next = flat[index + 1];
          if (next === undefined) return;
          focusNode(next.item.id);
          onFocusMoved(next.item.id);
        } else {
          onToggleFolder?.(node.item, true);
        }
        return;
      }
      case "ArrowLeft": {
        event.preventDefault();
        event.stopPropagation();
        if (node.item.type === "folder" && expandedIds.has(node.item.id)) {
          onToggleFolder?.(node.item, false);
        } else if (node.parentId !== null) {
          focusNode(node.parentId);
          onFocusMoved(node.parentId);
        }
        return;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        event.stopPropagation();
        onActivateRow(node);
        return;
      }
      default:
    }
  };

  return { flat, effectiveFocusedId, registerNode, onRowKeyDown, setFocusedId };
};
