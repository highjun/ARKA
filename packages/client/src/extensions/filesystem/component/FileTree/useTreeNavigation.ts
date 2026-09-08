import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { isApplePlatform } from './shared';
import type { FileTreeItem, FileTreeItemId } from './FileTree';

export interface FlatTreeNode {
  readonly item: FileTreeItem;
  readonly level: number;
  readonly parentId: FileTreeItemId | null;
}

/** 펼쳐진 상태를 반영해 "지금 화면에 보이는 순서"로 평탄화한다 — 방향키 이동·roving tabindex 둘 다 이 순서를 기준으로 움직인다. */
export const flattenVisible = (
  items: readonly FileTreeItem[],
  expandedIds: ReadonlySet<FileTreeItemId>,
  level = 1,
  parentId: FileTreeItemId | null = null,
): FlatTreeNode[] => {
  const out: FlatTreeNode[] = [];
  for (const item of items) {
    out.push({ item, level, parentId });
    if (item.type === 'folder' && expandedIds.has(item.id) && item.children) {
      out.push(...flattenVisible(item.children, expandedIds, level + 1, item.id));
    }
  }
  return out;
};

/** mac은 Cmd+A, 그 외는 Ctrl+A. `selectionIntentOf`와 같은 플랫폼 분기를 쓴다. */
const isSelectAllEvent = (event: KeyboardEvent<HTMLElement>): boolean =>
  (isApplePlatform() ? event.metaKey : event.ctrlKey) && (event.key === 'a' || event.key === 'A');

/**
 * 트리 하나 분량의 roving tabindex + 방향키 이동 — WAI-ARIA APG의 tree 패턴(포커스 가능한 항목은
 * 언제나 하나뿐, 나머지는 `tabIndex=-1`)을 따른다.
 *
 * 이 훅은 "포커스와 키 라우팅"만 갖는다 — 선택(다중선택 집합·앵커)은 더 이상 여기 없다.
 * 활성화(Enter/Space)·범위 확장(Shift+화살표)·전체선택(Ctrl/Cmd+A)은 전부 콜백으로 위임해서,
 * `FileTree.tsx`가 `shared.ts`의 순수 함수로 실제 계산을 한다. `expandedIds`는 여전히 바깥
 * (ViewModel)이 갖는 controlled 상태다.
 */
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

  /**
   * 폴더 행은 자기 자식 `<li>`를 중첩해서 담는다(`role="group"`이 같은 `<li>` 안에 있다) — 그래서
   * 자식에서 일어난 keydown이 DOM을 타고 조상 폴더의 `<li>`까지 그대로 버블링된다. `stopPropagation`
   * 없이 두면, 조상도 "자기 기준" index로 같은 이벤트를 또 처리해서 방금 옮긴 포커스를 덮어써 버린다
   * (직접 겪음 — 두 번째 ArrowDown부터 포커스가 제자리로 튕겨 돌아왔다). 실제로 포커스를 가진
   * 가장 안쪽 행 하나만 처리하면 되므로, 인식하는 키는 여기서 버블을 끊는다.
   *
   * `Ctrl/Cmd+A`는 switch 안의 `case 'a':`로 넣지 않는다 — switch의 `default:`는 버블을 안
   * 끊으므로, 수식키 없는 'a' 입력(글자 타이핑)까지 이 case로 새므로 버블링 회귀의 세 번째
   * 재발 지점이 될 수 있다. 그래서 switch보다 먼저, "이 키 조합인가"로 따로 가른다.
   */
  const onRowKeyDown = (node: FlatTreeNode) => (event: KeyboardEvent<HTMLElement>) => {
    if (isSelectAllEvent(event)) {
      event.preventDefault();
      event.stopPropagation();
      onSelectAll();
      return;
    }

    const index = flat.findIndex((entry) => entry.item.id === node.item.id);

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        event.stopPropagation();
        const next = flat[index + 1];
        if (next === undefined) return;
        focusNode(next.item.id);
        if (event.shiftKey) onExtendSelection(next);
        else onFocusMoved(next.item.id);
        return;
      }
      case 'ArrowUp': {
        event.preventDefault();
        event.stopPropagation();
        const prev = flat[index - 1];
        if (prev === undefined) return;
        focusNode(prev.item.id);
        if (event.shiftKey) onExtendSelection(prev);
        else onFocusMoved(prev.item.id);
        return;
      }
      case 'Home': {
        event.preventDefault();
        event.stopPropagation();
        const first = flat[0];
        if (first === undefined) return;
        focusNode(first.item.id);
        onFocusMoved(first.item.id);
        return;
      }
      case 'End': {
        event.preventDefault();
        event.stopPropagation();
        const last = flat[flat.length - 1];
        if (last === undefined) return;
        focusNode(last.item.id);
        onFocusMoved(last.item.id);
        return;
      }
      case 'ArrowRight': {
        if (node.item.type !== 'folder') return;
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
      case 'ArrowLeft': {
        event.preventDefault();
        event.stopPropagation();
        if (node.item.type === 'folder' && expandedIds.has(node.item.id)) {
          onToggleFolder?.(node.item, false);
        } else if (node.parentId !== null) {
          focusNode(node.parentId);
          onFocusMoved(node.parentId);
        }
        return;
      }
      case 'Enter':
      case ' ': {
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
