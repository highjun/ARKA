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

const KIND_OF_LEGACY: Readonly<Record<string, string>> = {
  file: "arka.filesystem.text",
  settings: "arka.workbench.settings",
  keybindings: "arka.workbench.keybindings",
  markdownPreview: "arka.markdown.preview",
};

const legacyUriOf = (kind: string, id: string): URI | null => {
  switch (kind) {
    case "file":
      return URI.file(id);
    case "settings":
      return URI.parse("arka:///settings");
    // 단축키가 제 화면을 갖던 때의 탭 — 이제 설정 안의 한 범주라 거기로 보낸다.
    case "keybindings":
      return URI.parse("arka:///settings");
    case "markdownPreview":
      return id.startsWith("preview:") ? URI.parse(`markdown-preview:///${id.slice("preview:".length)}`) : null;
    default:
      return null;
  }
};

const restoreTab = (value: unknown): OpenTab | null => {
  if (typeof value !== "object" || value === null) return null;
  const { id, kind, title, uri } = value as { id?: unknown; kind?: unknown; title?: unknown; uri?: unknown };
  if (typeof id !== "string" || typeof kind !== "string" || typeof title !== "string") return null;
  try {
    const parsed = typeof uri === "string" ? URI.parse(uri) : legacyUriOf(kind, id);
    return parsed === null ? null : { id, kind: KIND_OF_LEGACY[kind] ?? kind, uri: parsed, title };
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
  static readonly #LEGACY_TABS_KEY = "workbench.tabs";
  static readonly #LEGACY_ACTIVE_TAB_ID_KEY = "workbench.activeTabId";

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
    if (raw !== null) {
      try {
        const restored = restoreNode(JSON.parse(raw));
        if (restored !== null) return restored;
      } catch {
        return TabLayout.#migrateLegacyTree(storage);
      }
    }
    return TabLayout.#migrateLegacyTree(storage);
  }

  static #migrateLegacyTree(storage: IStorage): PaneNode {
    const activeTabId = TabLayout.#restoreId(storage, TabLayout.#LEGACY_ACTIVE_TAB_ID_KEY);
    const raw = storage.get(TabLayout.#LEGACY_TABS_KEY);
    let tabs: readonly OpenTab[] = [];
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw);
        tabs = Array.isArray(parsed) ? parsed.map(restoreTab).filter((tab): tab is OpenTab => tab !== null) : [];
      } catch {
        tabs = [];
      }
    }
    return {
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs,
      activeTabId: tabs.some((tab) => tab.id === activeTabId) ? activeTabId : null,
    };
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
