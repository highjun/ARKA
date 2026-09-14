import { createContext, useContext } from "react";
import type {
  CSSProperties,
  Dispatch,
  DragEventHandler,
  FocusEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  MutableRefObject,
  PointerEventHandler,
  ReactNode,
  Ref,
  RefCallback,
  SetStateAction,
} from "react";
import { clsx } from "clsx";
import { getRootLeafState, useSplitBranch, useTabSplit } from "./useTabSplit";
import type {
  SplitDropPosition,
  SplitEdgeDropPosition,
  TabChrome,
  TabClassNames,
  TabDropZone,
  TabGroupItem,
  TabId,
  TabItem,
  TabSplitOrientation,
} from "./shared";
import { ClassNamesContext, useTabClassNames } from "./TabContext";
import { GroupImpl } from "./Group";

/** 잎은 탭 그룹 하나다. `size`는 형제 사이의 비율(%)이다. */
export interface TabTreeLeaf {
  readonly kind: "leaf";
  readonly id: string;
  readonly activeTab: TabId;
  readonly tabItems: readonly TabGroupItem[];
  readonly size?: number;
}

/** 가지는 방향과 자식만 갖는다 — 자식이 또 가지일 수 있어 재귀다. */
export interface TabTreeSplit {
  readonly kind: "split";
  readonly id: string;
  readonly orientation: TabSplitOrientation;
  readonly children: readonly TabTreeNode[];
  readonly size?: number;
}

/** `kind`로 갈리는 판별 유니온이다. */
export type TabTreeNode = TabTreeLeaf | TabTreeSplit;

/** 드래그 핸들러를 가로챈다 — 분할·재정렬을 이 컴포넌트가 직접 다룬다. */
export interface TabSplitProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onDragStart" | "onDrop"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 분할 레이아웃 자체 — 리프(탭 그룹)와 가지(분할 방향+자식)가 재귀적으로 중첩된다. */
  readonly tree: TabTreeNode;
  /** 지금 포커스/활성 상태인 리프의 id. */
  readonly activeLeaf?: string;
  /** 어느 리프에서든 탭 헤더를 클릭하면 그 리프 id·탭 id와 함께 호출된다. */
  readonly onTabClick: (leafId: string, tabId: string) => void;
  /** 어느 리프에서든 "더 보기" 메뉴 버튼을 클릭하면 그 리프 id와 함께 호출된다. */
  readonly onMenuClick: (leafId: string) => void;
  /** 탭을 닫으면 그 리프 id·탭 id와 함께 호출된다. 없으면 닫기 버튼 자체가 안 뜬다. */
  readonly onTabClose?: (leafId: string, tabId: string) => void;
  /** 같은 리프 안에서 드래그로 순서를 바꾸면 그 리프 id·새 전체 목록과 함께 호출된다. */
  readonly onTabReorder?: (leafId: string, nextItems: TabGroupItem[]) => void;
  /**
   * 어느 리프에서든 미리보기 탭(`isPreview`)을 더블클릭하면 그 리프 id·탭 id와 함께 호출된다 —
   * 없으면 더블클릭해도 아무 일도 없다(옵트인).
   */
  readonly onTabPin?: (leafId: string, tabId: string) => void;
  /** 탭을 다른 리프로 드래그해 옮기면 원본/대상 리프 id·탭 id와 함께 호출된다. */
  readonly onTabMove?: (fromLeafId: string, toLeafId: string, tabId: string) => void;
  /** 탭을 리프 가장자리로 드래그해 새 분할을 만들면 원본 리프 id·탭 id·위치와 함께 호출된다. */
  readonly onTabSplit?: (sourceLeafId: string, tabId: string, position: SplitEdgeDropPosition) => void;
  /** 리사이즈 핸들을 드래그해 두 자식의 비율을 바꾸면 가지 id·자식 id·새 크기와 함께 호출된다. */
  readonly onNodeResize?: (branchId: string, childId: string, nextSize: number) => void;
  /** 리프의 `tabItems`가 빈 배열일 때 패널 자리에 보여줄 내용. */
  readonly emptyMessage?: ReactNode;
  /** 리프의 `tabItems`가 빈 배열일 때 스트립 자리에 보여줄 내용. */
  readonly stripEmptyLabel?: ReactNode;
  /** 주어지면 탭 헤더가 우클릭에 반응해 이 결과를 `Menu.Content`로 띄운다 — 없으면 지금처럼 아무 일도 없다(옵트인). */
  readonly renderTabContextMenu?: (tab: TabItem) => ReactNode;
  /** 프레임(테두리·radius·배경) 유무. 기본값 `'bordered'`. */
  readonly chrome?: TabChrome;
}

/** `sizes`는 정규화를 거쳐 합이 100이다. */
export interface SplitState {
  readonly orientation: TabSplitOrientation;
  readonly sizes: number[];
  readonly disabledResize: boolean;
}

/** 잎 하나가 받는 드래그 핸들러. `onDropCapture`인 이유는 안쪽 스트립보다 먼저 봐야 해서다. */
export interface SplitLeafHandlers {
  readonly onDragStart: DragEventHandler<HTMLElement>;
  readonly onDragOver: DragEventHandler<HTMLElement>;
  readonly onDragLeave: DragEventHandler<HTMLElement>;
  readonly onDropCapture: DragEventHandler<HTMLElement>;
  readonly onDragEnd: DragEventHandler<HTMLElement>;
}

/** 나누는 선(버튼)이 받는 핸들러 — 포인터와 키보드 둘 다로 크기를 바꾼다. */
interface SplitResizeHandlers {
  readonly onPointerEnter: PointerEventHandler<HTMLElement>;
  readonly onPointerLeave: PointerEventHandler<HTMLElement>;
  readonly onFocus: FocusEventHandler<HTMLElement>;
  readonly onBlur: FocusEventHandler<HTMLElement>;
  readonly onPointerDown: PointerEventHandler<HTMLElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
}

/** 자식 하나가 그릴 때 보는 파생 상태. `style`에 이미 계산된 비율이 들어 있다. */
export interface SplitChildState {
  readonly node: TabTreeNode;
  readonly index: number;
  readonly isLast: boolean;
  readonly orientation: TabSplitOrientation;
  readonly isActive: boolean;
  readonly dropZone: TabDropZone | null;
  readonly dropPosition: SplitDropPosition | null;
  readonly isResizing: boolean;
  readonly isHandleVisible: boolean;
  readonly style: CSSProperties;
  readonly handlers?: SplitLeafHandlers;
  readonly resizeHandlers: SplitResizeHandlers;
}

/** 트리 전체가 잎 하나일 때 — 가지가 없어 나누는 선도 없다. */
export interface SplitRootLeafState {
  readonly node: TabTreeLeaf;
  readonly isActive: boolean;
  readonly dropZone: TabDropZone | null;
  readonly dropPosition: SplitDropPosition | null;
  readonly handlers: SplitLeafHandlers;
}

/** `strip`에는 위치가 없다 — 스트립 자체의 표시는 `StripDropIndicator`가 든다. */
export type SplitDropIndicator =
  | { readonly leafId: string; readonly zone: "panel"; readonly position: SplitDropPosition }
  | { readonly leafId: string; readonly zone: "strip" };

/** 분할이 자식들에게 내려보내는 것 전부. `visibleTree`는 드래그 중 미리보기가 반영된 트리다. */
export interface SplitContextValue {
  readonly visibleTree: TabTreeNode;
  readonly activeLeaf?: string;
  readonly onTabClick: (leafId: string, tabId: string) => void;
  readonly onMenuClick: (leafId: string) => void;
  readonly onTabClose?: (leafId: string, tabId: string) => void;
  readonly onTabReorder?: (leafId: string, nextItems: TabGroupItem[]) => void;
  readonly onTabMove?: (fromLeafId: string, toLeafId: string, tabId: string) => void;
  readonly onTabSplit?: (sourceLeafId: string, tabId: string, position: SplitEdgeDropPosition) => void;
  readonly onNodeResize?: (branchId: string, childId: string, nextSize: number) => void;
  readonly dragSourceRef: MutableRefObject<{ leafId: string; tabId: string } | null>;
  readonly dropIndicator: SplitDropIndicator | null;
  readonly setDropIndicator: Dispatch<SetStateAction<SplitDropIndicator | null>>;
  readonly resizingChildId: string | null;
  readonly setResizingChildId: Dispatch<SetStateAction<string | null>>;
  readonly visibleHandleChildId: string | null;
  readonly setVisibleHandleChildId: Dispatch<SetStateAction<string | null>>;
}

/** 하나의 DOM 노드에 내부 ref(리사이즈 측정용)와 밖에서 전달된 ref를 동시에 꽂는다. */
const mergeRefs =
  <T,>(...refs: ReadonlyArray<Ref<T> | null | undefined>): RefCallback<T> =>
  (node) => {
    for (const ref of refs) {
      if (ref == null) continue;
      if (typeof ref === "function") ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };

// ─────────────────────────── TabSplit leaf → TabGroup 콜백 바인딩 ───────────────────────────

/** TabSplit 의 leaf 하나가 자기 id 를 미리 채운 채로 안쪽 TabGroup 에 콜백을 넘긴다(LeafSection/RootLeafSection 공용). */
const handleLeafTabClick = (onTabClick: (leafId: string, tabId: TabId) => void, leafId: string) => (tabId: TabId) =>
  onTabClick(leafId, tabId);

const handleLeafMenuClick = (onMenuClick: (leafId: string) => void, leafId: string) => () => onMenuClick(leafId);

const handleLeafTabClose = (onTabClose: ((leafId: string, tabId: TabId) => void) | undefined, leafId: string) =>
  onTabClose ? (tabId: TabId) => onTabClose(leafId, tabId) : undefined;

const handleLeafTabReorder = (
  onTabReorder: ((leafId: string, nextItems: TabGroupItem[]) => void) | undefined,
  leafId: string,
) => (onTabReorder ? (nextItems: TabGroupItem[]) => onTabReorder(leafId, nextItems) : undefined);

const handleLeafTabPin = (onTabPin: ((leafId: string, tabId: TabId) => void) | undefined, leafId: string) =>
  onTabPin ? (tabId: TabId) => onTabPin(leafId, tabId) : undefined;

const SplitContext = createContext<SplitContextValue | null>(null);
const useSplitContext = () => {
  const context = useContext(SplitContext);
  if (!context) throw new Error("Tab.Split parts must be used within Tab.Split");
  return context;
};

const ResizeHandle = ({ state }: { state: SplitChildState }) => {
  const classNames = useTabClassNames();

  return state.isLast ? null : (
    // `button`이 아니라 포커스 받는 `separator`다 — 창을 나누는 손잡이의 정본 패턴이고
    // (WAI-ARIA window splitter), `button` 역할은 `aria-orientation`을 받지 않는다. 키보드
    // 조작은 `resizeHandlers`의 `onKeyDown`이 이미 든다.
    <div
      {...state.resizeHandlers}
      role="separator"
      tabIndex={0}
      aria-label={`Resize tab group ${state.node.id}`}
      aria-orientation={state.orientation === "horizontal" ? "vertical" : "horizontal"}
      data-orientation={state.orientation}
      data-resizing={state.isResizing ? "true" : "false"}
      data-visible={state.isHandleVisible ? "true" : "false"}
      className={classNames.resizeHandle}
    />
  );
};

type LeafPassthrough = Pick<
  TabSplitProps,
  | "onTabClick"
  | "onMenuClick"
  | "onTabClose"
  | "onTabReorder"
  | "onTabPin"
  | "emptyMessage"
  | "stripEmptyLabel"
  | "renderTabContextMenu"
>;

const LeafSection = ({
  state,
  onTabClick,
  onMenuClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  emptyMessage,
  stripEmptyLabel,
  renderTabContextMenu,
}: { state: SplitChildState } & LeafPassthrough) => {
  const classNames = useTabClassNames();
  const leaf = state.node as TabTreeLeaf;

  return (
    <section
      {...state.handlers}
      data-active={state.isActive ? "" : undefined}
      className={clsx(undefined, classNames.leafSection, state.isActive && classNames.leafSectionActive)}
      style={state.style}
    >
      <GroupImpl
        activeTab={leaf.activeTab}
        tabItems={leaf.tabItems}
        onTabClick={handleLeafTabClick(onTabClick, leaf.id)}
        onMenuClick={handleLeafMenuClick(onMenuClick, leaf.id)}
        onTabClose={handleLeafTabClose(onTabClose, leaf.id)}
        onTabReorder={handleLeafTabReorder(onTabReorder, leaf.id)}
        onTabPin={handleLeafTabPin(onTabPin, leaf.id)}
        emptyMessage={emptyMessage}
        stripEmptyLabel={stripEmptyLabel}
        renderTabContextMenu={renderTabContextMenu}
        className={classNames.leafGroup}
        panelLabel={`Tab group ${leaf.id}`}
        panelOverlay={
          state.dropZone === "panel" && state.dropPosition ? (
            <span aria-hidden="true" data-position={state.dropPosition} className={classNames.panelDropIndicator} />
          ) : undefined
        }
        stripOverlay={
          state.dropZone === "strip" ? <span aria-hidden="true" className={classNames.stripDropOverlay} /> : undefined
        }
      />
      <ResizeHandle state={state} />
    </section>
  );
};

const SplitBranch = ({
  node,
  isRoot = false,
  rootProps,
  className,
  childState,
  onTabClick,
  onMenuClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  emptyMessage,
  stripEmptyLabel,
  renderTabContextMenu,
  ref,
}: {
  node: TabTreeSplit;
  isRoot?: boolean;
  rootProps?: Omit<HTMLAttributes<HTMLDivElement>, "children">;
  className?: string;
  childState?: SplitChildState;
} & LeafPassthrough & { readonly ref?: Ref<HTMLElement> }) => {
  const classNames = useTabClassNames();
  const shared = useSplitContext();
  const branch = useSplitBranch(node, shared);
  const isHorizontal = branch.orientation === "horizontal";
  const showDivider = Boolean(childState && !childState.isLast);

  return (
    <div
      {...(isRoot ? rootProps : {})}
      ref={mergeRefs<HTMLElement>(branch.ref, isRoot ? ref : null)}
      data-orientation={branch.orientation}
      style={isRoot ? undefined : childState?.style}
      className={clsx(
        isRoot ? className : undefined,
        isRoot
          ? isHorizontal
            ? classNames.splitRootHorizontal
            : classNames.splitRootVertical
          : isHorizontal
            ? classNames.splitBranchHorizontal
            : classNames.splitBranchVertical,
        showDivider &&
          (childState?.orientation === "horizontal"
            ? classNames.splitBranchDividerHorizontal
            : classNames.splitBranchDividerVertical),
      )}
    >
      {branch.childStates.map((state) =>
        state.node.kind === "leaf" ? (
          <LeafSection
            key={state.node.id}
            state={state}
            onTabClick={onTabClick}
            onMenuClick={onMenuClick}
            onTabClose={onTabClose}
            onTabReorder={onTabReorder}
            onTabPin={onTabPin}
            emptyMessage={emptyMessage}
            stripEmptyLabel={stripEmptyLabel}
            renderTabContextMenu={renderTabContextMenu}
          />
        ) : (
          <SplitBranch
            key={state.node.id}
            node={state.node}
            childState={state}
            onTabClick={onTabClick}
            onMenuClick={onMenuClick}
            onTabClose={onTabClose}
            onTabReorder={onTabReorder}
            onTabPin={onTabPin}
            emptyMessage={emptyMessage}
            stripEmptyLabel={stripEmptyLabel}
            renderTabContextMenu={renderTabContextMenu}
          />
        ),
      )}
      {!isRoot && childState ? <ResizeHandle state={childState} /> : null}
    </div>
  );
};
SplitBranch.displayName = "Tab.Split.Branch";

const RootLeafSection = ({
  leaf,
  rootProps,
  className,
  onTabClick,
  onMenuClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  emptyMessage,
  stripEmptyLabel,
  renderTabContextMenu,
  ref,
}: {
  leaf: TabTreeLeaf;
  rootProps: Omit<HTMLAttributes<HTMLDivElement>, "children">;
  className?: string;
} & LeafPassthrough & { readonly ref?: Ref<HTMLElement> }) => {
  const classNames = useTabClassNames();
  const shared = useSplitContext();
  const state = getRootLeafState(leaf, shared);

  return (
    <section {...rootProps} {...state.handlers} ref={ref} className={clsx(className, classNames.rootLeafSection)}>
      <GroupImpl
        activeTab={leaf.activeTab}
        tabItems={leaf.tabItems}
        onTabClick={handleLeafTabClick(onTabClick, leaf.id)}
        onMenuClick={handleLeafMenuClick(onMenuClick, leaf.id)}
        onTabClose={handleLeafTabClose(onTabClose, leaf.id)}
        onTabReorder={handleLeafTabReorder(onTabReorder, leaf.id)}
        onTabPin={handleLeafTabPin(onTabPin, leaf.id)}
        emptyMessage={emptyMessage}
        stripEmptyLabel={stripEmptyLabel}
        renderTabContextMenu={renderTabContextMenu}
        className={classNames.rootLeafGroup}
        panelLabel={`Tab group ${leaf.id}`}
        panelOverlay={
          state.dropZone === "panel" && state.dropPosition ? (
            <span aria-hidden="true" data-position={state.dropPosition} className={classNames.panelDropIndicator} />
          ) : undefined
        }
        stripOverlay={
          state.dropZone === "strip" ? <span aria-hidden="true" className={classNames.stripDropOverlay} /> : undefined
        }
      />
    </section>
  );
};
RootLeafSection.displayName = "Tab.Split.RootLeafSection";

/** 실제 구현 — `data-component`를 스스로 찍지 않는다(공개 `Tab.Split`이 필요하면 감싸서 찍는다). */
export const SplitRootImpl = ({
  tree,
  activeLeaf,
  onTabClick,
  onMenuClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  onTabMove,
  onTabSplit,
  onNodeResize,
  emptyMessage,
  stripEmptyLabel,
  renderTabContextMenu,
  className,
  classNames: providedClassNames,
  ref,
  ...rootProps
}: TabSplitProps & { readonly classNames?: TabClassNames } & { readonly ref?: Ref<HTMLElement> }) => {
  const inherited = useTabClassNames();
  const classNames = providedClassNames ?? inherited;
  const { visibleTree, context } = useTabSplit({
    tree,
    activeLeaf,
    onTabClick,
    onMenuClick,
    onTabClose,
    onTabReorder,
    onTabMove,
    onTabSplit,
    onNodeResize,
  });

  const passthrough = {
    onTabClick,
    onMenuClick,
    onTabClose,
    onTabReorder,
    onTabPin,
    emptyMessage,
    stripEmptyLabel,
    renderTabContextMenu,
  };
  const rootPropsWithData = { ...rootProps, "data-component": "Tab" };

  return (
    <ClassNamesContext value={classNames}>
      <SplitContext value={context}>
        {visibleTree.kind === "leaf" ? (
          <RootLeafSection
            ref={ref}
            leaf={visibleTree}
            rootProps={rootPropsWithData}
            className={className}
            {...passthrough}
          />
        ) : (
          <SplitBranch
            ref={ref}
            node={visibleTree}
            isRoot
            rootProps={rootPropsWithData}
            className={className}
            {...passthrough}
          />
        )}
      </SplitContext>
    </ClassNamesContext>
  );
};
SplitRootImpl.displayName = "Tab.Split";
