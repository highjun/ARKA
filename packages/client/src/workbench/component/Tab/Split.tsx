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
export type { PaneId } from "../../row/tabRows";
import type { PaneId } from "../../row/tabRows";
import { ClassNamesContext, useTabClassNames } from "./TabContext";
import { GroupImpl } from "./Group";

export interface TabSplitProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "onDragStart" | "onDrop" | "onSelect" | "onResize"
> {
  readonly ref?: Ref<HTMLElement>;
  readonly tree: PaneRowNode;
  readonly activePaneId: PaneId;
  readonly isNarrow?: boolean;
  readonly renderContent?: (paneId: PaneId, tabId: TabId) => ReactNode;
  readonly onSelect?: (paneId: PaneId, tabId: TabId) => void;
  readonly onClose?: (paneId: PaneId, tabId: TabId) => void;
  readonly onSplit?: (paneId: PaneId, tabId: TabId, edge: SplitEdge) => void;
  readonly onResize?: (branchId: PaneId, childId: PaneId, nextSize: number) => void;
  readonly onReorder?: (paneId: PaneId, nextTabIds: readonly TabId[]) => void;
  readonly onPin?: (paneId: PaneId, tabId: TabId) => void;
  readonly onMove?: (fromPaneId: PaneId, toPaneId: PaneId, tabId: TabId) => void;
  readonly renderTabMenu?: (paneId: PaneId, tabId: TabId) => ReactNode;
  readonly emptyMessage?: ReactNode;
  readonly chrome?: TabChrome;
}

export interface SplitState {
  readonly orientation: TabSplitOrientation;
  readonly sizes: number[];
  readonly disabledResize: boolean;
}

export interface SplitLeafHandlers {
  readonly onDragStart: DragEventHandler<HTMLElement>;
  readonly onDragOver: DragEventHandler<HTMLElement>;
  readonly onDragLeave: DragEventHandler<HTMLElement>;
  readonly onDropCapture: DragEventHandler<HTMLElement>;
  readonly onDragEnd: DragEventHandler<HTMLElement>;
}

interface SplitResizeHandlers {
  readonly onPointerEnter: PointerEventHandler<HTMLElement>;
  readonly onPointerLeave: PointerEventHandler<HTMLElement>;
  readonly onFocus: FocusEventHandler<HTMLElement>;
  readonly onBlur: FocusEventHandler<HTMLElement>;
  readonly onPointerDown: PointerEventHandler<HTMLElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
}

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

export interface SplitRootLeafState {
  readonly node: PaneRowLeaf;
  readonly isActive: boolean;
  readonly dropZone: TabDropZone | null;
  readonly dropPosition: SplitDropPosition | null;
  readonly handlers: SplitLeafHandlers;
}

export type SplitDropIndicator =
  | { readonly leafId: string; readonly zone: "panel"; readonly position: SplitDropPosition }
  | { readonly leafId: string; readonly zone: "strip" };

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

const mergeRefs =
  <T,>(...refs: ReadonlyArray<Ref<T> | null | undefined>): RefCallback<T> =>
  (node) => {
    for (const ref of refs) {
      if (ref == null) continue;
      if (typeof ref === "function") ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };

const bindPane = <T,>(callback: ((paneId: PaneId, value: T) => void) | undefined, paneId: PaneId) =>
  callback ? (value: T) => callback(paneId, value) : undefined;

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
