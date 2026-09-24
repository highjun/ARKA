import { URI } from "#contracts";
import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IStorage } from "./IStorage";
import { ROOT_PANE_ID } from "./tabsShare";
import type { ITabLayout, OpenTab, PaneId, PaneNode } from "./ITabLayout";

type StoredTab = Omit<OpenTab, "uri"> & { readonly uri: string };
type StoredNode =
  | { kind: "leaf"; id: PaneId; tabs: readonly StoredTab[]; activeTabId: string | null; size?: number }
  | {
      kind: "split";
      id: PaneId;
      orientation: "horizontal" | "vertical";
      children: readonly StoredNode[];
      size?: number;
    };

const restoreTab = (value: unknown): OpenTab | null => {
  if (typeof value !== "object" || value === null) return null;
  const { id, kind, title, uri } = value as { id?: unknown; kind?: unknown; title?: unknown; uri?: unknown };
  if (typeof id !== "string" || typeof kind !== "string" || typeof title !== "string") return null;
  if (typeof uri !== "string") return null;
  try {
    return { id, kind, uri: URI.parse(uri), title };
  } catch {
    return null;
  }
};

const restoreNode = (value: unknown): PaneNode | null => {
  if (typeof value !== "object" || value === null) return null;
  const node = value as Partial<StoredNode> & { tabs?: unknown; children?: unknown };
  if (node.kind === "leaf" && typeof node.id === "string" && Array.isArray(node.tabs)) {
    const tabs = node.tabs.map(restoreTab).filter((tab): tab is OpenTab => tab !== null);
    const activeTabId = tabs.some((tab) => tab.id === node.activeTabId)
      ? (node.activeTabId ?? null)
      : (tabs[0]?.id ?? null);
    return { kind: "leaf", id: node.id, tabs, activeTabId, ...(node.size === undefined ? {} : { size: node.size }) };
  }
  if (node.kind === "split" && typeof node.id === "string" && Array.isArray(node.children)) {
    const children = node.children.map(restoreNode).filter((child): child is PaneNode => child !== null);
    const orientation = node.orientation === "vertical" ? "vertical" : "horizontal";
    return {
      kind: "split",
      id: node.id,
      orientation,
      children,
      ...(node.size === undefined ? {} : { size: node.size }),
    };
  }
  return null;
};

const storeNode = (node: PaneNode): StoredNode =>
  node.kind === "leaf"
    ? { ...node, tabs: node.tabs.map((tab) => ({ ...tab, uri: tab.uri.toString() })) }
    : { ...node, children: node.children.map(storeNode) };

export class TabLayout implements ITabLayout {
  static readonly #TREE_KEY = "workbench.tabTree";
  static readonly #ACTIVE_PANE_ID_KEY = "workbench.activePaneId";
  static readonly #PREVIEW_TAB_ID_KEY = "workbench.previewTabId";

  readonly #storage: IStorage;
  readonly #changed = new Emitter();
  #tree: PaneNode;
  #activePaneId: PaneId;
  #previewTabId: string | null;

  constructor({ storage }: { storage: IStorage }) {
    this.#storage = storage;
    this.#tree = TabLayout.#restoreTree(storage);
    this.#activePaneId = TabLayout.#restoreActivePaneId(storage);
    this.#previewTabId = TabLayout.#restoreId(storage, TabLayout.#PREVIEW_TAB_ID_KEY);
  }

  get tree(): PaneNode {
    return this.#tree;
  }

  setTree(tree: PaneNode): void {
    if (this.#tree === tree) return;
    this.#tree = tree;
    this.#storage.set(TabLayout.#TREE_KEY, JSON.stringify(storeNode(tree)));
    this.#changed.fire();
  }

  get activePaneId(): PaneId {
    return this.#activePaneId;
  }

  setActivePaneId(id: PaneId): void {
    if (this.#activePaneId === id) return;
    this.#activePaneId = id;
    this.#storage.set(TabLayout.#ACTIVE_PANE_ID_KEY, id);
    this.#changed.fire();
  }

  get previewTabId(): string | null {
    return this.#previewTabId;
  }

  setPreviewTabId(id: string | null): void {
    if (this.#previewTabId === id) return;
    this.#previewTabId = id;
    this.#storage.set(TabLayout.#PREVIEW_TAB_ID_KEY, id ?? "");
    this.#changed.fire();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  static #restoreTree(storage: IStorage): PaneNode {
    const raw = storage.get(TabLayout.#TREE_KEY);
    if (raw === null) return TabLayout.#emptyTree();
    try {
      return restoreNode(JSON.parse(raw)) ?? TabLayout.#emptyTree();
    } catch {
      return TabLayout.#emptyTree();
    }
  }

  static #emptyTree(): PaneNode {
    return { kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null };
  }

  static #restoreActivePaneId(storage: IStorage): PaneId {
    const raw = storage.get(TabLayout.#ACTIVE_PANE_ID_KEY);
    return raw === null || raw === "" ? ROOT_PANE_ID : raw;
  }

  static #restoreId(storage: IStorage, key: string): string | null {
    const raw = storage.get(key);
    return raw === null || raw === "" ? null : raw;
  }
}
