import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, Ref } from 'react';
import { clsx } from 'clsx';
import { useTreeNavigation, flattenVisible } from './useTreeNavigation';
import { compactFolderChains, isApplePlatform, nextSelection, selectAll, selectionIncluding, selectionIntentOf } from './shared';
import type { FlatTreeNode } from './useTreeNavigation';
import styles from './FileTree.module.css';
import { Icon } from '#component/Icon';
import { FileIcon } from '../FileIcon';

/** 워크스페이스 루트 기준 경로다 — 트리 안에서 유일하다. */
export type FileTreeItemId = string;
/** 폴더만 펼칠 수 있고 앞자리에 셰브론이 온다. */
export type FileTreeItemType = 'folder' | 'file';

/** 트리가 그리는 데 필요한 최소 정보. 자식은 `children`으로 재귀한다. */
export interface FileTreeItem {
  readonly id: FileTreeItemId;
  readonly name: string;
  readonly type: FileTreeItemType;
  /**
   * 이 행에 관련된 요청이 진행 중이다(자식 목록을 읽는 중·파일을 여는 중·이름 편집을 커밋하는
   * 중 등) — 행 오른쪽 끝에 작은 Circular Progress로 드러난다. 예전엔 폴더 전용으로 펼친 자리에
   * "불러오는 중…" 한 줄을 따로 그렸지만, 파일 열기·이름 편집처럼 폴더가 아닌 경우도 생겨 행
   * 자신의 상태로 통일했다.
   */
  readonly loading?: boolean;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly children?: readonly FileTreeItem[];
}

/**
 * 프레임(테두리·배경) 유무 — `Container`와 같은 이름이지만 기본값은 반대다. `bordered`도
 * radius는 없다(패널 안에 꽉 차는 워크스페이스 섹션이라 카드가 아니다 — `FileTree.module.css`
 * 주석 참고). 기본은 `none`이다 — 실제 소비처(`apps/workbench`)가 이미 항상 패널 안에 꽉 채워
 * 쓴다. 독립된 미리보기처럼 스스로 경계가 필요할 때만 `bordered`로 바꾼다.
 */
export type FileTreeChrome = 'bordered' | 'none';

/**
 * props를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다.
 *
 * 빈 목록일 땐 `<div>`(빈 상태 안내문), 아니면 `<ul role="tree">`를 그린다 — 공통 조상 타입으로 둔다.
 *
 * `Omit`에 `onSelect`를 남겨 둔다 — 다중선택 도입(2026-08-27)으로 `onSelect(item)`(선택이자 활성화를
 * 겸하던 단수 API)을 `selectedIds`/`onSelectedIdsChange`(선택)+`onActivate`(활성화)로 갈랐다. 구
 * `onSelect`를 계속 넘기는 코드는 조용히 무시되는 대신 **타입 에러**로 잡힌다 — 개명의 가장 큰
 * 위험(조용한 동작 상실)을 컴파일 타임에 막으려는 의도적 선택이다.
 */
interface RowProps {
  readonly node: FlatTreeNode;
  readonly expandedIds: ReadonlySet<string>;
  readonly selectedIds: ReadonlySet<string>;
  readonly focusedId: string | undefined;
  readonly onRowClick: (node: FlatTreeNode, event: MouseEvent<HTMLElement>) => void;
  readonly onRowDoubleClick: (node: FlatTreeNode, event: MouseEvent<HTMLElement>) => void;
  readonly onRowContextMenu: (node: FlatTreeNode, event: MouseEvent<HTMLElement>) => void;
  readonly onKeyDown: ReturnType<typeof useTreeNavigation>['onRowKeyDown'];
  readonly registerNode: ReturnType<typeof useTreeNavigation>['registerNode'];
  readonly setFocusedId: ReturnType<typeof useTreeNavigation>['setFocusedId'];
  /** `onItemDrop`이 있을 때만 true — 없으면 항목이 아예 `draggable`이 안 된다. */
  readonly dndEnabled: boolean;
  readonly dropTargetId: FileTreeItemId | undefined;
  readonly onRowDragStart: (node: FlatTreeNode, event: DragEvent<HTMLElement>) => void;
  readonly onRowDragOver: (node: FlatTreeNode, event: DragEvent<HTMLElement>) => void;
  readonly onRowDrop: (node: FlatTreeNode, event: DragEvent<HTMLElement>) => void;
  readonly onRowDragEnd: () => void;
  /** 지금 이름을 편집 중인 행 — 있으면 그 행의 라벨이 `<input>`으로 바뀐다(한 번에 하나뿐). */
  readonly editingId: FileTreeItemId | undefined;
  readonly onEditCommit: (item: FileTreeItem, value: string) => void;
  readonly onEditCancel: (item: FileTreeItem) => void;
}

/**
 * 이름 편집 중인 행의 라벨 자리 — 마운트되면 즉시 포커스 + 전체 선택한다(파일명을 통째로
 * 덮어쓰는 게 흔한 경우라서, 확장자 앞까지만 선택하는 VSCode 식 절반 선택은 이번 범위 밖).
 * `Enter`로 커밋, `Escape`로 취소, 포커스를 잃으면(다른 곳 클릭 등) 커밋한다.
 *
 * `stopPropagation`을 여기서 건다 — 안 그러면 이 `<input>`을 감싼 행의 `onKeyDown`(트리 키보드
 * 내비게이션, 방향키로 행을 옮기는 등)이 같은 키 입력에 또 반응한다.
 */
const EditableLabel = ({ value, onCommit, onCancel }: { readonly value: string; readonly onCommit: (next: string) => void; readonly onCancel: () => void }) => {
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
      className={styles['labelInput']}
      defaultValue={value}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          // `blur()`를 직접 부르지 않는다 — 그러면 이 이벤트 안에서 `onBlur`도 동기적으로 튀어
          // 커밋이 두 번 불린다. 부모가 `editingId`를 지우면 이 입력은 blur 이벤트 없이 그냥
          // 사라진다(언마운트는 blur를 발생시키지 않는다).
          event.preventDefault();
          onCommit(event.currentTarget.value);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={(event) => onCommit(event.currentTarget.value)}
    />
  );
};

/**
 * **앞자리를 두 칸이 아니라 조건문 하나로 만든다.** Primer `TreeView`는 셰브론과 아이콘을 별개
 * 그리드 칸으로 나눠, 겹치게 옮기면 뒤쪽이 클릭을 가로챘다(2026-08-24 실측). 폴더든 파일이든
 * 같은 슬롯에 와야 하므로 무엇을 그릴지만 고른다.
 *
 * **행 전체가 하나의 클릭 대상이다** — 폴더는 펼치기와 선택을 함께 부른다. 작은 셰브론 대신 넓은
 * 탭 영역이 된다. Ctrl/Shift가 눌려 있으면(다중선택) 둘 다 건너뛴다. 키보드 이동은
 * `useTreeNavigation`이 WAI-ARIA APG의 tree 패턴으로 든다(타이프어헤드는 뺐다).
 */
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
  const isFolder = item.type === 'folder';
  const expanded = isFolder && expandedIds.has(item.id);
  const isSelected = selectedIds.has(item.id);
  const isEditing = editingId === item.id;

  const handleClick = (event: MouseEvent<HTMLElement>) => onRowClick(node, event);
  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => onRowDoubleClick(node, event);

  /**
   * disabled 행("비어 있다"/"불러오는 중…"/에러 자리표시)은 `onRowContextMenu`를 안 부르는 것만으론
   * 부족하다 — 여기서 멈추면 이벤트가 그대로 위로 버블링돼, 감싸는 `ContextMenu.Trigger`(컴포넌트
   * 밖, `onContextMenu` 자체를 모르는 계약이라 이 행이 disabled인지 알 길이 없다)가 그걸 받아 메뉴를
   * 열어 버린다. 그러면 `onContextMenu` 콜백이 한 번도 안 불렸으니 앱 쪽 "우클릭한 대상"은 이전
   * 값(주로 없음)에 머무는데, 메뉴는 뜬 채로 "새 파일"을 고르면 그 대상 없음이 조용히 워크스페이스
   * 루트로 풀려 엉뚱한 곳에 파일이 생긴다 — 그래서 여기서 `stopPropagation`으로 아예 못 나가게 막는다.
   */
  const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
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
      // disabled 행은 애초에 선택될 수 없으므로 "선택 안 됨"이라고 알릴 이유가 없다 — 속성 자체를
      // 안 낸다. 나머지는 다중선택 트리 정본(APG)대로 선택 여부와 무관하게 항상 true/false를 낸다.
      aria-selected={item.disabled ? undefined : isSelected}
      aria-disabled={item.disabled || undefined}
      tabIndex={item.id === focusedId ? 0 : -1}
      data-active={isSelected ? '' : undefined}
      // 지금 드래그 중인 항목이 이 폴더 위에 있다 — `onItemDrop`이 없으면(`dndEnabled` false)
      // 애초에 드래그 자체가 안 시작되므로 이 값도 항상 비어 있다.
      data-drop={dropTargetId === item.id ? 'inside' : undefined}
      className={styles['item']}
      draggable={dndEnabled && !item.disabled}
      onDragStart={(event) => onRowDragStart(node, event)}
      onDragEnter={(event) => onRowDragOver(node, event)}
      onDragOver={(event) => onRowDragOver(node, event)}
      onDrop={(event) => onRowDrop(node, event)}
      onDragEnd={onRowDragEnd}
      // React의 onFocus는 native와 달리 조상까지 버블링된다. 자식 행이 DOM으로 중첩돼 있어,
      // 자식이 포커스를 받으면 부모의 onFocus가 뒤이어 불려 `focusedId`를 부모 id로 덮어썼다.
      // `target !== currentTarget`이면 후손이 받은 focus가 올라온 것이므로 무시한다.
      onFocus={(event) => {
        if (event.target !== event.currentTarget) return;
        setFocusedId(item.id);
      }}
      onKeyDown={onKeyDown(node)}
    >
      <div
        className={styles['row']}
        // 깊이별 들여쓰기 + 패널 가장자리로부터의 기본 인셋(`--space-sm`, `.row`의
        // `margin-inline` 음수 상쇄와 짝) — 인라인 스타일이 CSS 클래스보다 항상 이기므로
        // `.row`의 `padding-inline`으로는 이 값을 못 준다, 여기서 직접 더한다.
        style={{ paddingLeft: `calc(${level - 1} * var(--space-md) + var(--space-sm))` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <span className={styles['marker']} aria-hidden="true">
          {isFolder ? <Icon iconId={expanded ? 'chevronDown' : 'chevronRight'} size="sm" /> : <FileIcon fileName={item.name} className={styles['fileIcon']} />}
        </span>
        {isEditing ? (
          <EditableLabel
            value={item.name}
            onCommit={(value) => onEditCommit(item, value)}
            onCancel={() => onEditCancel(item)}
          />
        ) : (
          // 긴 이름은 ellipsis로 잘린다(`.label`) — `title`이 네이티브 hover 툴팁으로 전체 이름을
          // 보여준다. VSCode·JetBrains 등 대부분의 파일 탐색기가 wrap 대신 이 방식을 쓴다.
          <span className={styles['label']} title={item.name}>
            {item.name}
          </span>
        )}
        {/* 이 행 자체에 관련된 요청(자식 목록 로딩·편집 커밋 등)이 진행 중이다. */}
        {item.loading ? <Icon iconId="loading" size="sm" className={styles['trailingSpinner']} aria-label="처리 중" /> : null}
      </div>
      {isFolder && expanded ? (
        <ul role="group" className={styles['group']}>
          {/* 이 그룹(= 이 폴더의 자식들)이 공유하는 들여쓰기 안내선 하나 — 자식 행 자신의
              `paddingLeft`(아래 재귀 호출에서 `level + 1`)와 마커 칸 중앙에 맞춘 x좌표를 인라인
              스타일로 직접 준다(CSS 커스텀 프로퍼티로 다리를 놓으면 stylelint의 Primer 토큰
              검사가 "알 수 없는 커스텀 프로퍼티"로 오탐한다). */}
          <span
            aria-hidden="true"
            className={styles['guide']}
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

/** `onSelect`·`onContextMenu`를 가로챈다 — 행 단위로 다시 정의한다. */
export interface FileTreeProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onSelect' | 'onContextMenu'> {
  /** 트리에 표시할 항목(폴더·파일) — 계층 구조 자체가 이 목록의 `children`으로 표현된다. */
  readonly items: readonly FileTreeItem[];
  /** 프레임(테두리·radius·배경) 유무. */
  readonly chrome?: FileTreeChrome;
  /**
   * 하이브리드 controlled/uncontrolled — 값을 넘기면(undefined가 아니면) 그 값이 우선하고,
   * 이 컴포넌트는 자기 상태를 갖지 않는다(`apps/workbench`처럼 ViewModel이 지연 로딩과 함께
   * 이미 상태를 갖는 소비처를 위한 것). 아예 안 넘기면(controlled 계약을 안 맺으면) 컴포넌트가
   * `defaultExpandedIds`를 시작값으로 자기 내부 상태를 관리한다 — Storybook의 `Default`
   * 스토리처럼 소비처 없이 그 자체로도 펼침/접힘이 동작해야 하는 자리를 위한 것.
   */
  readonly expandedIds?: readonly FileTreeItemId[];
  /** uncontrolled 모드의 펼침 집합 초깃값. */
  readonly defaultExpandedIds?: readonly FileTreeItemId[];
  /** 선택 집합(작업 대상) — 하이브리드 controlled/uncontrolled. 순서는 "고른 순"이지 트리 순서가
   * 아니다(범위 선택 결과만 트리 순서를 따른다 — `shared.ts`의 `nextSelection` 참고). */
  readonly selectedIds?: readonly FileTreeItemId[];
  /** uncontrolled 모드의 선택 집합 초깃값. */
  readonly defaultSelectedIds?: readonly FileTreeItemId[];
  /** `items`가 빈 배열일 때 트리 대신 보여줄 내용. */
  readonly emptyLabel?: ReactNode;
  /** 폴더 하나가 펼쳐지거나 접힐 때마다 호출된다. */
  readonly onToggleFolder?: (item: FileTreeItem, expanded: boolean) => void;
  /** 펼침 집합이 바뀔 때마다(controlled 여부 무관) 호출되며 새 전체 집합을 받는다 — 폴더 하나의
   * 펼침/접힘만 필요하면 `onToggleFolder`를 쓴다. */
  readonly onExpandedIdsChange?: (ids: readonly FileTreeItemId[]) => void;
  /** 선택 집합이 바뀔 때마다(controlled 여부 무관) 호출되며 새 전체 집합을 받는다. */
  readonly onSelectedIdsChange?: (ids: readonly FileTreeItemId[]) => void;
  /**
   * 활성화(열기) — 수식키 없는 클릭·Enter·Space에서만 불린다. Ctrl/Cmd+클릭(토글)이나 Shift+클릭
   * (범위)은 선택만 바꾸고 이걸 부르지 않는다 — 다중선택 도중 파일이 열리면 안 되기 때문이다.
   */
  readonly onActivate?: (item: FileTreeItem) => void;
  /**
   * 행을 더블클릭했다. Tab 헤더 더블클릭이 미리보기 탭을 고정하는 것과 같은 뜻으로 쓰라고 만든
   * 자리다(소비처가 무엇을 할지 정한다 — 이 컴포넌트는 "더블클릭됐다"만 안다). 수식키 없는
   * 단일 클릭(`onActivate`)이 먼저 불린 뒤에 온다 — 브라우저의 `dblclick`이 원래 그렇다.
   */
  readonly onRowDoubleClick?: (item: FileTreeItem) => void;
  /**
   * 행을 우클릭했다 — 어느 행인지만 알린다. 메뉴 자체(무엇을 보여줄지, 어디에 띄울지)는
   * 이 컴포넌트의 일이 아니다. `preventDefault`/`stopPropagation`을 하지 않으므로, 이 이벤트를
   * 감싸는 컨텍스트 메뉴(예: `ContextMenu.Trigger`)가 있으면 그쪽으로 그대로 버블링된다.
   *
   * 우클릭한 행이 선택 밖에 있으면 이 콜백이 불리기 **전에** 선택을 그 행 하나로 정규화한다(그리고
   * `onSelectedIdsChange`가 먼저 불린다) — "메뉴의 대상 = 지금 하이라이트된 것"이 항상 참이 되게
   * 하려는 것이다(VSCode `ExplorerView.onContextMenu`와 같은 규칙).
   */
  readonly onContextMenu?: (item: FileTreeItem, event: MouseEvent<HTMLElement>) => void;
  /**
   * 항목을 폴더 위로 끌어다 놓았다 — `source`를 `target`(항상 폴더) 아래로 옮기라는 뜻. 실제
   * 이동(서버 호출·상태 갱신)은 소비처의 몫이다 — 이 컴포넌트는 네이티브 HTML5 드래그
   * (`dragstart`/`dragover`/`drop`) 제스처만 인식하고 어디서 어디로인지만 알린다.
   *
   * 이 prop이 없으면 항목 자체가 `draggable`이 안 된다 — 안 쓰는 소비처에서 드래그 커서만
   * 뜨고 아무 일도 안 일어나는 상황을 막는다. 파일뿐 아니라 폴더도 드래그 소스가 될 수 있다.
   * 자기 자신 위로는 드롭 대상이 되지 않는다(그 이상의 순환 방지 — 자손 폴더 위로 옮기는 것
   * 등 — 는 하지 않는다, 소비처가 필요하면 `source`/`target`으로 직접 판단한다).
   */
  readonly onItemDrop?: (source: FileTreeItem, target: FileTreeItem) => void;
  /**
   * 지금 이름을 편집 중인 항목 — 있으면 그 행의 라벨이 `<input>`으로 바뀐다(모달 대신 인라인
   * 편집, VSCode와 같은 방식). 새 파일/새 폴더도 같은 자리다 — 아직 실제로 만들어지지 않은
   * "유령" 항목을 `items`에 미리 끼워 넣고 그 id를 여기 준다(이 컴포넌트는 항목이 실재하는지
   * 모른다, `items` 배열이 유일한 데이터 출처라는 원칙 그대로다).
   */
  readonly editingId?: FileTreeItemId;
  /** 편집을 확정했다(Enter 또는 포커스 이탈) — `value`는 다듬지 않은 원본 입력이다. */
  readonly onEditCommit?: (item: FileTreeItem, value: string) => void;
  /** 편집을 취소했다(Escape). */
  readonly onEditCancel?: (item: FileTreeItem) => void;
}

/**
 * 워크스페이스 파일 트리 — `filesystem/` 도메인의 기본 탐색 UI. `items` 배열을 재귀 렌더링하는
 * data-driven 컴포넌트다(Primer `TreeView`의 compound API는 따르지 않는다 — 위 `Row` 주석의
 * 이유로 이미 한 번 포기했고, 실제 소비처(`apps/workbench`의 서버 지연 로딩 트리)가 동적·큰
 * 트리라 data-driven이 요구사항에 더 맞는다).
 *
 * `expandedIds`/`selectedIds`는 하이브리드 controlled/uncontrolled다(`ModeToggle`/`CommandPalette`
 * 등 다른 stateful 컴포넌트와 같은 관용구) — 값을 넘기면 그게 우선하고, 안 넘기면
 * `defaultExpandedIds`/`defaultSelectedIds`를 시작값으로 이 컴포넌트가 스스로 관리한다. 그 외에
 * "지금 포커스가 어디 있는지"는 항상 이 컴포넌트 내부 상태이고, `useTreeNavigation`에 있다.
 *
 * 다중선택의 "앵커"(Shift+클릭·Shift+화살표가 범위를 재는 기준점)는 `useRef`로 둔다 — 렌더에
 * 안 쓰이는 값이라 `useState`로 두면 Ctrl+클릭마다 불필요한 리렌더가 하나 더 는다.
 */
export const FileTree = forwardRef<HTMLElement, FileTreeProps>(
  (
    {
      items,
      chrome = 'none',
      expandedIds,
      defaultExpandedIds,
      selectedIds,
      defaultSelectedIds,
      emptyLabel = '파일이 없습니다',
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
      ...props
    },
    ref,
  ) => {
    const [uncontrolledExpandedIds, setUncontrolledExpandedIds] = useState<readonly FileTreeItemId[]>(defaultExpandedIds ?? []);
    const resolvedExpandedIds = expandedIds ?? uncontrolledExpandedIds;
    const [uncontrolledSelectedIds, setUncontrolledSelectedIds] = useState<readonly FileTreeItemId[]>(defaultSelectedIds ?? []);
    const resolvedSelectedIds = selectedIds ?? uncontrolledSelectedIds;
    const anchorRef = useRef<FileTreeItemId | undefined>(resolvedSelectedIds[0]);
    // VSCode의 `explorer.compactFolders`처럼, 폴더 하나만 자식으로 둔 체인을 한 행("a/b/c")으로
    // 합친다 — 아래 전부(포커스/선택/펼침/렌더)가 이 압축된 트리를 기준으로 동작한다.
    const compactedItems = useMemo(() => compactFolderChains(items), [items]);
    /**
     * 드래그 중인 항목은 `state`가 아니라 `ref`로 둔다 — `dragstart`·`dragenter`·`dragover`가
     * 브라우저에서 한 이벤트 루프 틱 안에 연달아 발생할 수 있고(실측: `dispatchEvent`로 세 이벤트를
     * 동기적으로 잇달아 쏘는 테스트에서 재현됨), `state`로 두면 `dragstart`의 `setState`가 아직
     * 리렌더로 반영되기 전에 `dragenter`가 옛 클로저(`draggedId === undefined`)를 읽어 조용히
     * 무시해 버린다. `ref`는 같은 틱에서도 즉시 최신값이라 이 경합이 없다. `dropTargetId`는
     * `data-drop` 렌더에 실제로 쓰이므로 `state`로 둔다 — 이건 리렌더 한 사이클 지연이 있어도
     * 된다(소비처가 `dragover` 뒤 폴링으로 기다린다, `FileTreeProps.onItemDrop` 참고).
     */
    const draggedIdRef = useRef<FileTreeItemId | undefined>(undefined);
    const [dropTargetId, setDropTargetId] = useState<FileTreeItemId | undefined>(undefined);

    const handleToggleFolder = (item: FileTreeItem, expanded: boolean) => {
      const nextExpandedIds = expanded ? [...resolvedExpandedIds, item.id] : resolvedExpandedIds.filter((id) => id !== item.id);
      if (expandedIds === undefined) setUncontrolledExpandedIds(nextExpandedIds);
      onToggleFolder?.(item, expanded);
      onExpandedIdsChange?.(nextExpandedIds);
    };

    const commitSelection = (ids: readonly FileTreeItemId[]) => {
      if (selectedIds === undefined) setUncontrolledSelectedIds(ids);
      onSelectedIdsChange?.(ids);
    };

    // `resolvedExpandedIds`/`resolvedSelectedIds`가 안정된 참조로 오면, 매 렌더 새 `Set`을 만들던
    // 이전 구현과 달리 아래 `flat` useMemo와 `useTreeNavigation` 내부의 것이 실제로 캐시를 탄다.
    const expandedSet = useMemo(() => new Set(resolvedExpandedIds), [resolvedExpandedIds]);
    const selectedSet = useMemo(() => new Set(resolvedSelectedIds), [resolvedSelectedIds]);
    // `useTreeNavigation`도 똑같은 입력(items, expandedSet)으로 자기 몫의 `flat`을 다시 계산한다 —
    // 두 번 계산되지만 트리 크기에 선형이라 무시할 비용이고, 그 대가로 각 층이 자기 관심사(포커스/키
    // 라우팅 vs 선택)만 갖는다.
    const flat = useMemo(() => flattenVisible(compactedItems, expandedSet), [compactedItems, expandedSet]);
    const orderRows = useMemo(() => flat.map((node) => node.item), [flat]);

    const activateNode = (node: FlatTreeNode) => {
      const { item } = node;
      if (item.disabled) return;
      anchorRef.current = item.id;
      commitSelection([item.id]);
      if (item.type === 'folder') handleToggleFolder(item, !expandedSet.has(item.id));
      item.onClick?.();
      onActivate?.(item);
    };

    const handleExtendSelection = (node: FlatTreeNode) => {
      const { ids, anchorId } = nextSelection({
        intent: 'range',
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

    /**
     * mac에서 Ctrl+클릭은 보조 클릭(컨텍스트 메뉴)이다 — Safari 등에서 `contextmenu`와 `click`이
     * 둘 다 발생할 수 있어, 여기서 걸러 두지 않으면 "선택 교체 + 메뉴"가 한 번에 겹쳐 뜬다.
     */
    const handleRowClick = (node: FlatTreeNode, event: MouseEvent<HTMLElement>) => {
      const { item } = node;
      if (item.disabled) return;
      if (isApplePlatform() && event.ctrlKey) return;

      const intent = selectionIntentOf(event);
      if (intent === 'replace') {
        activateNode(node);
        setFocusedId(item.id);
        return;
      }

      const { ids, anchorId } = nextSelection({ intent, current: resolvedSelectedIds, order: orderRows, anchorId: anchorRef.current, targetId: item.id });
      anchorRef.current = anchorId;
      commitSelection(ids);
      // jsdom의 `fireEvent.click`은 실제 포커스를 옮기지 않는다 — roving tabindex와 다음 키보드
      // 조작(Shift+화살표 등)이 이 행을 기준으로 이어지려면 명시적으로 불러야 한다.
      setFocusedId(item.id);
    };

    const handleRowDoubleClick = (node: FlatTreeNode) => {
      if (node.item.disabled) return;
      onRowDoubleClick?.(node.item);
    };

    /**
     * 우클릭한 행이 선택 밖이면 선택을 그 행 하나로 정규화한다(VSCode `ExplorerView.onContextMenu`와
     * 같은 규칙) — "메뉴의 대상 = 지금 하이라이트된 것"이 항상 참이 되게 한다. 안 그러면 3개가
     * 하이라이트된 채로 실제 대상은 우클릭한 1개뿐인, 화면이 거짓말하는 상태가 만들어진다.
     */
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

    /**
     * 진짜 HTML5 드래그(`dragstart`/`dragover`/`drop`) 이벤트를 쓴다 — `onItemDrop`이 없으면
     * 항목 자체가 `draggable`이 아니라 여기까지 안 온다(`Row`의 `draggable={dndEnabled && ...}`).
     *
     * **셋 다 `stopPropagation`으로 시작한다.** 펼친 폴더는 자식 행을 부모 `<li>` 안에 그대로
     * 중첩해 그리므로(`Row`), 안쪽 행에서 쏜 드래그 이벤트가 막지 않으면 조상 행들의 핸들러까지
     * 순서대로(안쪽→바깥) 다시 불린다 — 그러면 마지막(가장 바깥) 조상의 `item.id`가 실제
     * 대상을 덮어써 버린다(실측 확인: 중첩 파일을 중첩 폴더 위로 끌면 `dropTargetId`가 항상
     * 최상위 조상으로 튀었다). 딱 이 행 하나만 반응하게 막는다 — "조상까지 버블돼 대상이
     * 되는" 기능은 이번 범위에 없다.
     */
    const handleRowDragStart = (node: FlatTreeNode, event: DragEvent<HTMLElement>) => {
      event.stopPropagation();
      event.dataTransfer.effectAllowed = 'move';
      draggedIdRef.current = node.item.id;
    };

    /** 폴더 위에서만 드롭을 허용한다 — `preventDefault`가 그 신호다(안 부르면 브라우저가
     * `drop` 자체를 안 낸다). 자기 자신 위로는 드롭 대상이 되지 않는다. */
    const handleRowDragOver = (node: FlatTreeNode, event: DragEvent<HTMLElement>) => {
      event.stopPropagation();
      const draggedId = draggedIdRef.current;
      if (draggedId === undefined || node.item.type !== 'folder' || node.item.id === draggedId) return;
      event.preventDefault();
      setDropTargetId((current) => (current === node.item.id ? current : node.item.id));
    };

    const handleRowDrop = (node: FlatTreeNode, event: DragEvent<HTMLElement>) => {
      event.stopPropagation();
      event.preventDefault();
      const draggedId = draggedIdRef.current;
      if (draggedId !== undefined && node.item.type === 'folder' && node.item.id !== draggedId) {
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
          // 빈 상태는 <div>, 아니면 <ul>이라 실제 DOM 타입이 갈린다 — 공개 계약은 공통 조상
          // HTMLElement로 두므로(위 FileTreeProps 주석), 각 분기에서 실제 태그에 맞춰 좁힌다.
          ref={ref as Ref<HTMLDivElement>}
          data-chrome={chrome}
          className={clsx(className, styles['root'])}
          {...props}
          data-component="FileTree"
        >
          <div className={styles['empty']}>{emptyLabel}</div>
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
        className={clsx(className, styles['root'])}
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
  },
);

