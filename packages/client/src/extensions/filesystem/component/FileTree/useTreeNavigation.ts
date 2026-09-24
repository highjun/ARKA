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

const isMultiModifier = (event: KeyboardEvent<HTMLElement>): boolean =>
  isApplePlatform() ? event.metaKey : event.ctrlKey;

const isSelectAllEvent = (event: KeyboardEvent<HTMLElement>): boolean =>
  isMultiModifier(event) && (event.key === "a" || event.key === "A");

export interface TreeNavigationOptions {
  readonly items: readonly FileTreeItem[];
  readonly expandedIds: ReadonlySet<FileTreeItemId>;
  /** 포커스 행이 사라졌을 때 돌아갈 자리 — 보통 선택의 첫 항목이다. */
  readonly fallbackId: FileTreeItemId | undefined;
  readonly onToggleFolder: ((item: FileTreeItem, expanded: boolean) => void) | undefined;
  /** Enter·Space — 열거나 펼친다. */
  readonly onActivateRow: (node: FlatTreeNode) => void;
  /** 화살표·Home·End — 포커스가 가는 곳으로 선택도 따라간다. */
  readonly onSelectSingle: (node: FlatTreeNode) => void;
  /** Shift+화살표·Shift+Home·Shift+End — 앵커부터 범위. */
  readonly onExtendSelection: (node: FlatTreeNode) => void;
  /** Ctrl/Cmd+Space — 포커스 행을 선택에 넣거나 뺀다. */
  readonly onToggleSelection: (node: FlatTreeNode) => void;
  readonly onSelectAll: () => void;
  /** Escape — 선택을 포커스 행 하나로 줄인다. */
  readonly onCollapseSelection: (node: FlatTreeNode) => void;
}

export const useTreeNavigation = ({
  items,
  expandedIds,
  fallbackId,
  onToggleFolder,
  onActivateRow,
  onSelectSingle,
  onExtendSelection,
  onToggleSelection,
  onSelectAll,
  onCollapseSelection,
}: TreeNavigationOptions) => {
  const flat = useMemo(() => flattenVisible(items, expandedIds), [items, expandedIds]);
  const [focusedId, setFocusedId] = useState<FileTreeItemId | undefined>(fallbackId ?? flat[0]?.item.id);
  const nodesRef = useRef(new Map<FileTreeItemId, HTMLLIElement>());
  /** 마지막으로 포커스를 준 자리. 그 행이 사라지면 같은 자리의 다음 행으로 내려앉는다. */
  const lastIndexRef = useRef(0);
  const lastNodeRef = useRef<FlatTreeNode | undefined>(undefined);

  const registerNode = (id: FileTreeItemId) => (element: HTMLLIElement | null) => {
    if (element === null) nodesRef.current.delete(id);
    else nodesRef.current.set(id, element);
  };

  const rememberFocus = (id: FileTreeItemId) => {
    const index = flat.findIndex((node) => node.item.id === id);
    if (index >= 0) {
      lastIndexRef.current = index;
      lastNodeRef.current = flat[index];
    }
    setFocusedId(id);
  };

  /** 포커스 행이 사라졌을 때 어디에 앉을지. 부모가 접혀서 사라진 것이면 그 부모, 지워져서 사라진 것이면 같은 자리. */
  const survivingFocusedId = (): FileTreeItemId | undefined => {
    const parentId = lastNodeRef.current?.parentId ?? null;
    const parentFolded = parentId !== null && !expandedIds.has(parentId);
    if (parentFolded && flat.some((node) => node.item.id === parentId)) return parentId;
    if (fallbackId !== undefined && flat.some((node) => node.item.id === fallbackId)) return fallbackId;
    return flat[lastIndexRef.current]?.item.id ?? flat[lastIndexRef.current - 1]?.item.id ?? flat[0]?.item.id;
  };

  const effectiveFocusedId =
    focusedId !== undefined && flat.some((node) => node.item.id === focusedId) ? focusedId : survivingFocusedId();

  const focusNode = (id: FileTreeItemId | undefined) => {
    if (id === undefined) return;
    rememberFocus(id);
    nodesRef.current.get(id)?.focus();
  };

  const moveTo = (node: FlatTreeNode | undefined, event: KeyboardEvent<HTMLElement>) => {
    if (node === undefined) return;
    focusNode(node.item.id);
    if (event.shiftKey) onExtendSelection(node);
    else if (!isMultiModifier(event)) onSelectSingle(node);
  };

  const onRowKeyDown = (node: FlatTreeNode) => (event: KeyboardEvent<HTMLElement>) => {
    if (isSelectAllEvent(event)) {
      event.preventDefault();
      event.stopPropagation();
      onSelectAll();
      return;
    }

    if (event.key === " " && isMultiModifier(event)) {
      event.preventDefault();
      event.stopPropagation();
      onToggleSelection(node);
      return;
    }

    const index = flat.findIndex((entry) => entry.item.id === node.item.id);

    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        event.stopPropagation();
        moveTo(flat[event.key === "ArrowDown" ? index + 1 : index - 1], event);
        return;
      }
      case "Home":
      case "End": {
        event.preventDefault();
        event.stopPropagation();
        moveTo(event.key === "Home" ? flat[0] : flat[flat.length - 1], event);
        return;
      }
      case "ArrowRight": {
        if (node.item.type !== "folder") return;
        event.preventDefault();
        event.stopPropagation();
        if (expandedIds.has(node.item.id)) moveTo(flat[index + 1], event);
        else onToggleFolder?.(node.item, true);
        return;
      }
      case "ArrowLeft": {
        event.preventDefault();
        event.stopPropagation();
        if (node.item.type === "folder" && expandedIds.has(node.item.id)) {
          onToggleFolder?.(node.item, false);
        } else if (node.parentId !== null) {
          moveTo(
            flat.find((entry) => entry.item.id === node.parentId),
            event,
          );
        }
        return;
      }
      case "Escape": {
        event.preventDefault();
        event.stopPropagation();
        onCollapseSelection(node);
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

  return { flat, effectiveFocusedId, registerNode, onRowKeyDown, setFocusedId: rememberFocus };
};
