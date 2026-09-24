import { useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import styles from "./Tab.module.css";
import { firstGroupId, hasGroup, pruneTree, useTabDrop } from "./useTabDrop";
import { Group } from "./Group";
import { Panel } from "./Panel";
import { Split } from "./Split";
import { Strip } from "./Strip";
import { resolveActiveItem } from "./shared";
import type { GroupId, SplitEdge, TabGroup, TabId, TabTree } from "./shared";

/**
 * 탭 시스템 전체. `tree`를 받아 `Tab.Split` → `Tab.Group` → `Tab.Strip`·`Tab.Panel` 계층을 그린다.
 * `tree`가 필수다 — 분할이 없는 화면도 칸 하나짜리 트리라서 콜백 서명이 `(groupId, …)` 하나로 통일된다.
 */
export interface TabProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;

  /** 칸의 분할 트리. 탭이 하나도 없는 칸은 그리기 전에 잘라낸다. */
  readonly tree: TabTree;

  /** 포커스가 있는 칸. 트리에 하나뿐이라 칸마다 두지 않고 여기서 든다. */
  readonly activeGroupId?: GroupId;
  /** 비제어일 때의 처음 값. 생략하면 트리의 첫 칸. */
  readonly defaultActiveGroupId?: GroupId;

  /**
   * 활성 탭의 본문. 탭 내용을 그리는 유일한 길이다.
   * 칸을 인자로 받지 않는다 — 같은 탭은 어느 칸에 있든 같은 내용이다.
   */
  readonly renderContent?: (itemId: TabId) => ReactNode;
  /** 탭 우클릭 메뉴. 칸을 인자로 받는다 — 칸에 거는 명령("오른쪽으로 쪼개기")이 들어온다. */
  readonly renderItemMenu?: (groupId: GroupId, itemId: TabId) => ReactNode;
  /** 칸에 탭이 하나도 없을 때 내용 자리에 놓을 것. */
  readonly emptyMessage?: ReactNode;

  readonly onItemSelect?: (groupId: GroupId, itemId: TabId) => void;
  /** 없으면 닫기 버튼 자체를 안 그린다. */
  readonly onItemClose?: (groupId: GroupId, itemId: TabId) => void;
  /**
   * 탭을 이 Group 의 `beforeItemId` 앞으로 옮긴다 — 맨 뒤면 `null`.
   * 같은 Group 이면 그대로 순서 바꾸기다. 없으면 끌어 옮기기를 끈다.
   */
  readonly onItemMove?: (groupId: GroupId, itemId: TabId, beforeItemId: TabId | null) => void;
  /** 미리보기 탭 더블클릭. 없으면 더블클릭이 아무 일도 안 한다. */
  readonly onItemPin?: (groupId: GroupId, itemId: TabId) => void;
  /**
   * 탭을 칸 가장자리로 끌어다 놓아 쪼개기. 없으면 쪼개기 드롭을 안 받는다.
   * `groupId`는 **놓은 칸**이다 — 탭이 어느 칸에서 왔는지는 받는 쪽이 찾는다.
   */
  readonly onGroupSplit?: (groupId: GroupId, itemId: TabId, edge: SplitEdge) => void;
  /** Sash로 가지 안의 자식 크기를 바꾸기. 없으면 Sash를 안 그린다. */
  readonly onSplitResize?: (splitId: GroupId, childId: GroupId, nextSize: number) => void;
}

export const Root = ({
  tree,
  activeGroupId,
  defaultActiveGroupId,
  renderContent,
  renderItemMenu,
  emptyMessage,
  onItemSelect,
  onItemClose,
  onItemMove,
  onItemPin,
  onGroupSplit,
  onSplitResize,
  className,
  ref,
  ...props
}: TabProps) => {
  const visibleTree = useMemo(() => pruneTree(tree) ?? tree, [tree]);
  const [currentGroupId, setCurrentGroupId] = useControllableState<GroupId>({
    prop: activeGroupId,
    defaultProp: defaultActiveGroupId ?? firstGroupId(tree),
    caller: "Tab",
  });
  const resolvedGroupId =
    currentGroupId !== undefined && hasGroup(visibleTree, currentGroupId)
      ? currentGroupId
      : firstGroupId(visibleTree);
  const { indicator, sourceHandlersFor, dropHandlersFor } = useTabDrop({ onGroupSplit, onItemMove });

  const renderGroup = (group: TabGroup, size: number | undefined): ReactNode => {
    const active = resolveActiveItem(group.items, group.activeItemId);
    const dropTarget = indicator?.groupId === group.id ? indicator.target : null;

    return (
      <Group key={group.id} {...sourceHandlersFor(group)} isActive={group.id === resolvedGroupId} size={size}>
        {group.items.length > 0 ? (
          <Strip
            items={group.items}
            activeItemId={active?.id ?? null}
            renderItemMenu={renderItemMenu === undefined ? undefined : (itemId) => renderItemMenu(group.id, itemId)}
            onItemSelect={(itemId) => {
              setCurrentGroupId(group.id);
              onItemSelect?.(group.id, itemId);
            }}
            onItemClose={onItemClose === undefined ? undefined : (itemId) => onItemClose(group.id, itemId)}
            onItemMove={
              onItemMove === undefined ? undefined : (itemId, beforeItemId) => onItemMove(group.id, itemId, beforeItemId)
            }
            onItemPin={onItemPin === undefined ? undefined : (itemId) => onItemPin(group.id, itemId)}
          />
        ) : null}
        {/* 이름을 활성 탭 제목으로 지으면 화면의 다른 이름표와 겹친다 — 칸으로 가른다. */}
        <Panel
          {...dropHandlersFor(group)}
          aria-label={`탭 내용 ${group.id}`}
          data-empty={active === undefined ? "" : undefined}
        >
          {active === undefined ? emptyMessage : renderContent?.(active.id)}
          {dropTarget === null ? null : (
            <span
              aria-hidden="true"
              data-position={dropTarget === "center" ? undefined : dropTarget}
              className={styles["groupDropIndicator"]}
            />
          )}
        </Panel>
      </Group>
    );
  };

  /**
   * `size`는 자식이 아니라 부모가 내려준다 — **마지막 형제에게는 주지 않는다.**
   * 남은 자리를 마지막이 먹어야 크기의 합이 100이 아니어도 빈 틈이 안 생긴다.
   */
  const renderNode = (node: TabTree, size: number | undefined): ReactNode =>
    node.kind === "group" ? (
      renderGroup(node, size)
    ) : (
      <Split
        key={node.id}
        orientation={node.orientation}
        size={size}
        onResize={
          onSplitResize === undefined
            ? undefined
            : (childIndex, nextSize) => onSplitResize(node.id, node.children[childIndex]!.id, nextSize)
        }
      >
        {node.children.map((child, index) =>
          renderNode(child, index === node.children.length - 1 ? undefined : child.size),
        )}
      </Split>
    );

  return (
    <div ref={ref} {...props} data-component="Tab" className={clsx(className, styles["root"])}>
      {renderNode(visibleTree, undefined)}
    </div>
  );
};
