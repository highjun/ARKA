import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent, MouseEvent, HTMLAttributes, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { useTreeNavigation, flattenVisible } from "./useTreeNavigation";
import {
  compactFolderChains,
  isApplePlatform,
  nextSelection,
  selectAll,
  selectionIncluding,
  selectionIntentOf,
} from "./shared";
import type { FlatTreeNode } from "./useTreeNavigation";
import styles from "./FileTree.module.css";
import { Icon } from "#component/Icon";
import { FileIcon } from "../FileIcon";

export type FileTreeItemId = string;
type FileTreeItemType = "folder" | "file";

export interface FileTreeItem {
  readonly id: FileTreeItemId;
  readonly name: string;
  readonly type: FileTreeItemType;
  readonly loading?: boolean;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly children?: readonly FileTreeItem[];
}

type FileTreeChrome = "bordered" | "none";

interface RowProps {
  readonly node: FlatTreeNode;
  readonly expandedIds: ReadonlySet<string>;
  readonly selectedIds: ReadonlySet<string>;
  readonly focusedId: string | undefined;
  readonly onRowClick: (node: FlatTreeNode, event: MouseEvent<HTMLElement>) => void;
  readonly onRowDoubleClick: (node: FlatTreeNode, event: MouseEvent<HTMLElement>) => void;
  readonly onRowContextMenu: (node: FlatTreeNode, event: MouseEvent<HTMLElement>) => void;
  readonly onKeyDown: ReturnType<typeof useTreeNavigation>["onRowKeyDown"];
  readonly registerNode: ReturnType<typeof useTreeNavigation>["registerNode"];
  readonly setFocusedId: ReturnType<typeof useTreeNavigation>["setFocusedId"];
  readonly dndEnabled: boolean;
  readonly dropTargetId: FileTreeItemId | undefined;
  readonly onRowDragStart: (node: FlatTreeNode, event: DragEvent<HTMLElement>) => void;
  readonly onRowDragOver: (node: FlatTreeNode, event: DragEvent<HTMLElement>) => void;
  readonly onRowDrop: (node: FlatTreeNode, event: DragEvent<HTMLElement>) => void;
  readonly onRowDragEnd: () => void;
  readonly editingId: FileTreeItemId | undefined;
  readonly onEditCommit: (item: FileTreeItem, value: string) => void;
  readonly onEditCancel: (item: FileTreeItem) => void;
}

const EditableLabel = ({
  value,
  onCommit,
  onCancel,
}: {
  readonly value: string;
  readonly onCommit: (next: string) => void;
  readonly onCancel: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null) return;
    input.focus();
    input.select();
  }, []);

  return (
    <input
      ref={inputRef}
      className={styles["labelInput"]}
      defaultValue={value}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(event.currentTarget.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={(event) => onCommit(event.currentTarget.value)}
    />
  );
};

const Row = ({
  node,
  expandedIds,
  selectedIds,
  focusedId,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  onKeyDown,
  registerNode,
  setFocusedId,
  dndEnabled,
  dropTargetId,
  onRowDragStart,
  onRowDragOver,
  onRowDrop,
  onRowDragEnd,
  editingId,
  onEditCommit,
  onEditCancel,
}: RowProps) => {
  const { item, level } = node;
  const isFolder = item.type === "folder";
  const expanded = isFolder && expandedIds.has(item.id);
  const isSelected = selectedIds.has(item.id);
  const isEditing = editingId === item.id;

  const isOwnRow = (event: MouseEvent<HTMLElement>) =>
    (event.target as HTMLElement).closest('[role="treeitem"]') === event.currentTarget;

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (isOwnRow(event)) onRowClick(node, event);
  };
  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if (isOwnRow(event)) onRowDoubleClick(node, event);
  };

  const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (!isOwnRow(event)) return;
    if (item.disabled) {
      event.stopPropagation();
      return;
    }
    onRowContextMenu(node, event);
  };

  return (
    <li
      ref={registerNode(item.id)}
      role="treeitem"
      id={item.id}
      aria-label={item.name}
      aria-level={level}
      aria-expanded={isFolder ? expanded : undefined}
      aria-selected={item.disabled ? undefined : isSelected}
      aria-disabled={item.disabled || undefined}
      tabIndex={item.id === focusedId ? 0 : -1}
      data-active={isSelected ? "" : undefined}
      data-drop={dropTargetId === item.id ? "inside" : undefined}
      className={styles["item"]}
      draggable={dndEnabled && !item.disabled}
      onDragStart={(event) => onRowDragStart(node, event)}
      onDragEnter={(event) => onRowDragOver(node, event)}
      onDragOver={(event) => onRowDragOver(node, event)}
      onDrop={(event) => onRowDrop(node, event)}
      onDragEnd={onRowDragEnd}
      onFocus={(event) => {
        if (event.target !== event.currentTarget) return;
        setFocusedId(item.id);
      }}
      onKeyDown={onKeyDown(node)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className={styles["row"]} style={{ paddingLeft: `calc(${level - 1} * var(--space-md) + var(--space-sm))` }}>
        <span className={styles["marker"]} aria-hidden="true">
          {isFolder ? (
            <Icon iconId={expanded ? "chevronDown" : "chevronRight"} size="sm" />
          ) : (
            <FileIcon fileName={item.name} className={styles["fileIcon"]} />
          )}
        </span>
        {isEditing ? (
          <EditableLabel
            value={item.name}
            onCommit={(value) => onEditCommit(item, value)}
            onCancel={() => onEditCancel(item)}
          />
        ) : (
          <span className={styles["label"]} title={item.name}>
            {item.name}
          </span>
        )}
        {item.loading ? (
          <Icon iconId="loading" size="sm" className={styles["trailingSpinner"]} aria-label="처리 중" />
        ) : null}
      </div>
      {isFolder && expanded ? (
        <ul role="group" className={styles["group"]}>
          <span
            aria-hidden="true"
            className={styles["guide"]}
            style={{ left: `calc(${level} * var(--space-md) + var(--space-sm) + var(--base-size-20) / 2)` }}
          />
          {item.children?.map((child) => (
            <Row
              key={child.id}
              node={{ item: child, level: level + 1, parentId: item.id }}
              expandedIds={expandedIds}
              selectedIds={selectedIds}
              focusedId={focusedId}
              onRowClick={onRowClick}
              onRowDoubleClick={onRowDoubleClick}
              onRowContextMenu={onRowContextMenu}
              onKeyDown={onKeyDown}
              registerNode={registerNode}
              setFocusedId={setFocusedId}
              dndEnabled={dndEnabled}
              dropTargetId={dropTargetId}
              onRowDragStart={onRowDragStart}
              onRowDragOver={onRowDragOver}
              onRowDrop={onRowDrop}
              onRowDragEnd={onRowDragEnd}
              editingId={editingId}
              onEditCommit={onEditCommit}
              onEditCancel={onEditCancel}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
};

// eslint-disable-next-line no-restricted-syntax
export interface FileTreeProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "onSelect" | "onContextMenu"> {
  readonly ref?: Ref<HTMLElement>;
  readonly items: readonly FileTreeItem[];
  readonly chrome?: FileTreeChrome;
  readonly expandedIds?: readonly FileTreeItemId[];
  readonly defaultExpandedIds?: readonly FileTreeItemId[];
  readonly selectedIds?: readonly FileTreeItemId[];
  readonly defaultSelectedIds?: readonly FileTreeItemId[];
  readonly emptyLabel?: ReactNode;
  readonly onToggleFolder?: (item: FileTreeItem, expanded: boolean) => void;
  readonly onExpandedIdsChange?: (ids: readonly FileTreeItemId[]) => void;
  readonly onSelectedIdsChange?: (ids: readonly FileTreeItemId[]) => void;
  readonly onActivate?: (item: FileTreeItem) => void;
  readonly onRowDoubleClick?: (item: FileTreeItem) => void;
  readonly onContextMenu?: (item: FileTreeItem, event: MouseEvent<HTMLElement>) => void;
  readonly onItemDrop?: (source: FileTreeItem, target: FileTreeItem) => void;
  readonly editingId?: FileTreeItemId;
  readonly onEditCommit?: (item: FileTreeItem, value: string) => void;
  readonly onEditCancel?: (item: FileTreeItem) => void;
}

export const FileTree = ({
  items,
  chrome = "none",
  expandedIds,
  defaultExpandedIds,
  selectedIds,
  defaultSelectedIds,
  emptyLabel = "파일이 없습니다",
  onToggleFolder,
  onExpandedIdsChange,
  onSelectedIdsChange,
  onActivate,
  onRowDoubleClick,
  onContextMenu,
  onItemDrop,
  editingId,
  onEditCommit = () => {},
  onEditCancel = () => {},
  className,
  ref,
  ...props
}: FileTreeProps) => {
  const [uncontrolledExpandedIds, setUncontrolledExpandedIds] = useState<readonly FileTreeItemId[]>(
    defaultExpandedIds ?? [],
  );
  const resolvedExpandedIds = expandedIds ?? uncontrolledExpandedIds;
  const [uncontrolledSelectedIds, setUncontrolledSelectedIds] = useState<readonly FileTreeItemId[]>(
    defaultSelectedIds ?? [],
  );
  const resolvedSelectedIds = selectedIds ?? uncontrolledSelectedIds;
  const anchorRef = useRef<FileTreeItemId | undefined>(resolvedSelectedIds[0]);
  const compactedItems = useMemo(() => compactFolderChains(items), [items]);
  const draggedIdRef = useRef<FileTreeItemId | undefined>(undefined);
  const [dropTargetId, setDropTargetId] = useState<FileTreeItemId | undefined>(undefined);

  const handleToggleFolder = (item: FileTreeItem, expanded: boolean) => {
    const nextExpandedIds = expanded
      ? [...resolvedExpandedIds, item.id]
      : resolvedExpandedIds.filter((id) => id !== item.id);
    if (expandedIds === undefined) setUncontrolledExpandedIds(nextExpandedIds);
    onToggleFolder?.(item, expanded);
    onExpandedIdsChange?.(nextExpandedIds);
  };

  const commitSelection = (ids: readonly FileTreeItemId[]) => {
    if (selectedIds === undefined) setUncontrolledSelectedIds(ids);
    onSelectedIdsChange?.(ids);
  };

  const expandedSet = useMemo(() => new Set(resolvedExpandedIds), [resolvedExpandedIds]);
  const selectedSet = useMemo(() => new Set(resolvedSelectedIds), [resolvedSelectedIds]);
  const flat = useMemo(() => flattenVisible(compactedItems, expandedSet), [compactedItems, expandedSet]);
  const orderRows = useMemo(() => flat.map((node) => node.item), [flat]);

  const activateNode = (node: FlatTreeNode) => {
    const { item } = node;
    if (item.disabled) return;
    anchorRef.current = item.id;
    commitSelection([item.id]);
    if (item.type === "folder") handleToggleFolder(item, !expandedSet.has(item.id));
    item.onClick?.();
    onActivate?.(item);
  };

  const handleExtendSelection = (node: FlatTreeNode) => {
    const { ids, anchorId } = nextSelection({
      intent: "range",
      current: resolvedSelectedIds,
      order: orderRows,
      anchorId: anchorRef.current,
      targetId: node.item.id,
    });
    anchorRef.current = anchorId;
    commitSelection(ids);
  };

  const handleSelectAll = () => commitSelection(selectAll(orderRows));

  const handleFocusMoved = (id: FileTreeItemId) => {
    anchorRef.current = id;
  };

  const { effectiveFocusedId, registerNode, onRowKeyDown, setFocusedId } = useTreeNavigation(
    compactedItems,
    expandedSet,
    resolvedSelectedIds[0],
    handleToggleFolder,
    activateNode,
    handleExtendSelection,
    handleSelectAll,
    handleFocusMoved,
  );

  const handleRowClick = (node: FlatTreeNode, event: MouseEvent<HTMLElement>) => {
    const { item } = node;
    if (item.disabled) return;
    if (isApplePlatform() && event.ctrlKey) return;

    const intent = selectionIntentOf(event);
    if (intent === "replace") {
      activateNode(node);
      setFocusedId(item.id);
      return;
    }

    const { ids, anchorId } = nextSelection({
      intent,
      current: resolvedSelectedIds,
      order: orderRows,
      anchorId: anchorRef.current,
      targetId: item.id,
    });
    anchorRef.current = anchorId;
    commitSelection(ids);
    setFocusedId(item.id);
  };

  const handleRowDoubleClick = (node: FlatTreeNode) => {
    if (node.item.disabled) return;
    onRowDoubleClick?.(node.item);
  };

  const handleRowContextMenu = (node: FlatTreeNode, event: MouseEvent<HTMLElement>) => {
    const { item } = node;
    const ids = selectionIncluding(resolvedSelectedIds, item.id);
    if (ids !== resolvedSelectedIds) {
      anchorRef.current = item.id;
      commitSelection(ids);
    }
    setFocusedId(item.id);
    onContextMenu?.(item, event);
  };

  const handleRowDragStart = (node: FlatTreeNode, event: DragEvent<HTMLElement>) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    draggedIdRef.current = node.item.id;
  };

  const handleRowDragOver = (node: FlatTreeNode, event: DragEvent<HTMLElement>) => {
    event.stopPropagation();
    const draggedId = draggedIdRef.current;
    if (draggedId === undefined || node.item.type !== "folder" || node.item.id === draggedId) return;
    event.preventDefault();
    setDropTargetId((current) => (current === node.item.id ? current : node.item.id));
  };

  const handleRowDrop = (node: FlatTreeNode, event: DragEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const draggedId = draggedIdRef.current;
    if (draggedId !== undefined && node.item.type === "folder" && node.item.id !== draggedId) {
      const source = flat.find((flatNode) => flatNode.item.id === draggedId)?.item;
      if (source) onItemDrop?.(source, node.item);
    }
    draggedIdRef.current = undefined;
    setDropTargetId(undefined);
  };

  const handleRowDragEnd = () => {
    draggedIdRef.current = undefined;
    setDropTargetId(undefined);
  };

  if (compactedItems.length === 0) {
    return (
      <div
        ref={ref as Ref<HTMLDivElement>}
        data-chrome={chrome}
        className={clsx(className, styles["root"])}
        {...props}
        data-component="FileTree"
      >
        <div className={styles["empty"]}>{emptyLabel}</div>
      </div>
    );
  }

  return (
    <ul
      ref={ref as Ref<HTMLUListElement>}
      aria-label="파일 탐색기"
      role="tree"
      aria-multiselectable="true"
      data-chrome={chrome}
      className={clsx(className, styles["root"])}
      {...props}
      data-component="FileTree"
    >
      {compactedItems.map((item) => (
        <Row
          key={item.id}
          node={{ item, level: 1, parentId: null }}
          expandedIds={expandedSet}
          selectedIds={selectedSet}
          focusedId={effectiveFocusedId}
          onRowClick={handleRowClick}
          onRowDoubleClick={handleRowDoubleClick}
          onRowContextMenu={handleRowContextMenu}
          onKeyDown={onRowKeyDown}
          registerNode={registerNode}
          setFocusedId={setFocusedId}
          dndEnabled={onItemDrop !== undefined}
          dropTargetId={dropTargetId}
          onRowDragStart={handleRowDragStart}
          onRowDragOver={handleRowDragOver}
          onRowDrop={handleRowDrop}
          onRowDragEnd={handleRowDragEnd}
          editingId={editingId}
          onEditCommit={onEditCommit}
          onEditCancel={onEditCancel}
        />
      ))}
    </ul>
  );
};
