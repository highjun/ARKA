import type { URI } from "#contracts";
import type { Disposable } from "#core/di";
import type { PaneId, SplitOrientation } from "../row/tabRows";

export type { PaneId, SplitOrientation } from "../row/tabRows";

export interface OpenTab {
  readonly id: string;
  readonly kind: string;
  readonly uri: URI;
  readonly title: string;
}

export interface PaneLeaf {
  readonly kind: "leaf";
  readonly id: PaneId;
  readonly tabs: readonly OpenTab[];
  readonly activeTabId: string | null;
  readonly size?: number;
}

export interface PaneSplit {
  readonly kind: "split";
  readonly id: PaneId;
  readonly orientation: SplitOrientation;
  readonly children: readonly PaneNode[];
  readonly size?: number;
}

export type PaneNode = PaneLeaf | PaneSplit;

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.tabLayout": ITabLayout;
  }
}
export interface ITabLayout {
  readonly tree: PaneNode;
  setTree(tree: PaneNode): void;
  readonly activePaneId: PaneId;
  setActivePaneId(id: PaneId): void;
  readonly previewTabId: string | null;
  setPreviewTabId(id: string | null): void;
  onDidChange(listener: () => void): Disposable;
}
