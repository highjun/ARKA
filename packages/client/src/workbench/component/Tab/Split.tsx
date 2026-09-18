import { createContext, useContext } from "react";
import type {
  CSSProperties,
  ComponentPropsWithoutRef,
  Dispatch,
  DragEventHandler,
  FocusEventHandler,
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
  PaneRowLeaf,
  PaneRowNode,
  PaneRowSplit,
  SplitDropPosition,
  SplitEdge,
  TabChrome,
  TabClassNames,
  TabDropZone,
  TabId,
  TabSplitOrientation,
} from "./shared";
import { ClassNamesContext, useTabClassNames } from "./TabContext";
import { GroupImpl } from "./Group";

/** 분할 트리의 칸을 가리키는 불투명 문자열. */
export type PaneId = string;

/**
 * 분할 트리. 재귀로 그린다. 드래그 핸들러와 `onSelect`를 가로챈다 — 분할·재정렬·고르기를 이 컴포넌트가 직접 다룬다.
 * 콜백이 없으면 그 기능 자체가 꺼진다 — `onClose`가 없으면 닫기 버튼도, `onResize`가 없으면 손잡이도 안 뜬다.
 */
export interface TabSplitProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "onDragStart" | "onDrop" | "onSelect" | "onResize"
> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 분할 레이아웃 자체 — 칸(탭 그룹)과 가지(분할 방향+자식)가 재귀적으로 중첩된다. */
  readonly tree: PaneRowNode;
  /** 지금 포커스/활성 상태인 칸의 id. */
  readonly activePaneId: PaneId;
  /** 좁은 화면인가. `data-narrow`로 실린다. */
  readonly isNarrow?: boolean;
  /** 어느 칸의 활성 탭 내용을 그린다 — 없으면 그 탭의 `Content`를 그린다. 셸이 탭마다 컨테이너로 감쌀 때 쓴다. */
  readonly renderContent?: (paneId: PaneId, tabId: TabId) => ReactNode;
  /** 어느 칸에서든 탭 헤더를 클릭하면 그 칸 id·탭 id와 함께 호출된다. */
  readonly onSelect?: (paneId: PaneId, tabId: TabId) => void;
  /** 탭을 닫으면 그 칸 id·탭 id와 함께 호출된다. */
  readonly onClose?: (paneId: PaneId, tabId: TabId) => void;
  /** 탭을 칸 가장자리로 드래그해 새 분할을 만들면 원본 칸 id·탭 id·가장자리와 함께 호출된다. */
  readonly onSplit?: (paneId: PaneId, tabId: TabId, edge: SplitEdge) => void;
  /** 리사이즈 손잡이를 드래그해 두 자식의 비율을 바꾸면 가지 id·자식 id·새 크기와 함께 호출된다. */
  readonly onResize?: (branchId: PaneId, childId: PaneId, nextSize: number) => void;
  /** 같은 칸 안에서 드래그로 순서를 바꾸면 그 칸 id·새 id 순서와 함께 호출된다. 계약 밖이다. */
  readonly onReorder?: (paneId: PaneId, nextTabIds: readonly TabId[]) => void;
  /** 어느 칸에서든 미리보기 탭을 더블클릭하면 그 칸 id·탭 id와 함께 호출된다(옵트인). 계약 밖이다. */
  readonly onPin?: (paneId: PaneId, tabId: TabId) => void;
  /** 탭을 다른 칸의 띠로 드래그해 옮기면 원본/대상 칸 id·탭 id와 함께 호출된다. 계약 밖이다. */
  readonly onMove?: (fromPaneId: PaneId, toPaneId: PaneId, tabId: TabId) => void;
  /** 주어지면 탭 헤더가 우클릭에 반응해 이 결과를 `Menu.Content`로 띄운다(옵트인). 계약 밖이다. */
  readonly renderTabMenu?: (paneId: PaneId, tabId: TabId) => ReactNode;
  /** 칸의 `tabs`가 빈 배열일 때 패널 자리에 보여줄 내용. 계약 밖이다. */
  readonly emptyMessage?: ReactNode;
  /** 프레임(테두리·radius·배경) 유무. 기본값 `'bordered'`. 계약 밖이다. */
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
  readonly node: PaneRowNode;
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
  readonly node: PaneRowLeaf;
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
  readonly visibleTree: PaneRowNode;
  readonly activePaneId: PaneId;
  readonly onMove?: (fromPaneId: PaneId, toPaneId: PaneId, tabId: TabId) => void;
  readonly onSplit?: (paneId: PaneId, tabId: TabId, edge: SplitEdge) => void;
  readonly onResize?: (branchId: PaneId, childId: PaneId, nextSize: number) => void;
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

/** 칸 id를 미리 채운다 — `(paneId, x) => void`를 안쪽 그룹이 받는 `(x) => void`로. 없으면 없는 채로(기능이 꺼진다). */
const bindPane = <T,>(callback: ((paneId: PaneId, value: T) => void) | undefined, paneId: PaneId) =>
  callback ? (value: T) => callback(paneId, value) : undefined;

/** `bindPane`과 같되 돌려주는 값이 있는 것(메뉴·내용 렌더). */
const bindPaneRender = <T, R>(render: ((paneId: PaneId, value: T) => R) | undefined, paneId: PaneId) =>
  render ? (value: T) => render(paneId, value) : undefined;

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
  "onSelect" | "onClose" | "onReorder" | "onPin" | "renderTabMenu" | "renderContent" | "emptyMessage"
>;

/** 칸 하나가 안쪽 그룹에 넘기는 것 — 칸 id를 전부 미리 채운다(LeafSection/RootLeafSection 공용). */
const leafGroupProps = (leaf: PaneRowLeaf, passthrough: LeafPassthrough) => ({
  tabs: leaf.tabs,
  activeTabId: leaf.activeTabId,
  onSelect: bindPane(passthrough.onSelect, leaf.id),
  onClose: bindPane(passthrough.onClose, leaf.id),
  onReorder: bindPane(passthrough.onReorder, leaf.id),
  onPin: bindPane(passthrough.onPin, leaf.id),
  renderTabMenu: bindPaneRender(passthrough.renderTabMenu, leaf.id),
  renderContent: bindPaneRender(passthrough.renderContent, leaf.id),
  emptyMessage: passthrough.emptyMessage,
  panelLabel: `Tab group ${leaf.id}`,
});

const LeafSection = ({ state, ...passthrough }: { state: SplitChildState } & LeafPassthrough) => {
  const classNames = useTabClassNames();
  const leaf = state.node as PaneRowLeaf;

  return (
    <section
      {...state.handlers}
      data-active={state.isActive ? "" : undefined}
      className={clsx(undefined, classNames.leafSection, state.isActive && classNames.leafSectionActive)}
      style={state.style}
    >
      <GroupImpl
        {...leafGroupProps(leaf, passthrough)}
        className={classNames.leafGroup}
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
  ref,
  ...passthrough
}: {
  node: PaneRowSplit;
  isRoot?: boolean;
  rootProps?: Omit<ComponentPropsWithoutRef<"div">, "children">;
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
          <LeafSection key={state.node.id} state={state} {...passthrough} />
        ) : (
          <SplitBranch key={state.node.id} node={state.node} childState={state} {...passthrough} />
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
  ref,
  ...passthrough
}: {
  leaf: PaneRowLeaf;
  rootProps: Omit<ComponentPropsWithoutRef<"div">, "children">;
  className?: string;
} & LeafPassthrough & { readonly ref?: Ref<HTMLElement> }) => {
  const classNames = useTabClassNames();
  const shared = useSplitContext();
  const state = getRootLeafState(leaf, shared);

  return (
    <section {...rootProps} {...state.handlers} ref={ref} className={clsx(className, classNames.rootLeafSection)}>
      <GroupImpl
        {...leafGroupProps(leaf, passthrough)}
        className={classNames.rootLeafGroup}
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
  activePaneId,
  isNarrow,
  renderContent,
  onSelect,
  onClose,
  onSplit,
  onResize,
  onReorder,
  onPin,
  onMove,
  renderTabMenu,
  emptyMessage,
  className,
  classNames: providedClassNames,
  ref,
  ...rootProps
}: TabSplitProps & { readonly classNames?: TabClassNames } & { readonly ref?: Ref<HTMLElement> }) => {
  const inherited = useTabClassNames();
  const classNames = providedClassNames ?? inherited;
  const { visibleTree, context } = useTabSplit({ tree, activePaneId, onMove, onSplit, onResize });

  const passthrough: LeafPassthrough = {
    onSelect,
    onClose,
    onReorder,
    onPin,
    renderTabMenu,
    renderContent,
    emptyMessage,
  };
  const rootPropsWithData = { ...rootProps, "data-component": "Tab", "data-narrow": isNarrow ? "" : undefined };

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
