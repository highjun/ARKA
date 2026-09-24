import type { URI } from "#contracts";
import type { Container, Disposable } from "#core/di";
import { Emitter } from "#core/events";
import { DescriptorNotFoundError, type Registry } from "#core/registry";
import type { INotifications } from "./INotifications";
import type { ITabLayout, OpenTab, PaneNode } from "./ITabLayout";
import type { OpenOptions, TabDescriptor, TabProviderDescriptor } from "../api/ITabProviderDescriptor";
import type { ITabSystem } from "./ITabSystem";
import { collectTabs, findLeaf, firstLeafId, leafOfTab, pruneTree, replaceLeaf, withoutTabs } from "./paneTree";
import { ROOT_PANE_ID } from "./tabsShare";

const EMPTY_ROOT: PaneNode = { kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null };

export class TabSystem implements ITabSystem, Disposable {
  readonly #layout: ITabLayout;
  readonly #providers: Registry<TabProviderDescriptor>;
  readonly #notifications: INotifications;
  readonly #root: Container;
  readonly #descriptors = new Map<string, TabDescriptor>();
  readonly #containers = new Map<string, Container>();
  readonly #opening = new Map<string, Promise<void>>();
  readonly #changed = new Emitter();
  readonly #subscription: Disposable;

  constructor({
    layout,
    providers,
    notifications,
    root,
  }: {
    layout: ITabLayout;
    providers: Registry<TabProviderDescriptor>;
    notifications: INotifications;
    root: Container;
  }) {
    this.#layout = layout;
    this.#providers = providers;
    this.#notifications = notifications;
    this.#root = root;
    this.#sync();
    this.#subscription = layout.onDidChange(() => this.#sync());
  }

  async open(uri: URI, options: OpenOptions = {}): Promise<void> {
    const id = uri.toString();
    const inFlight = this.#opening.get(id);
    if (inFlight !== undefined) await inFlight;

    const existing = collectTabs(this.#layout.tree).find((tab) => tab.uri.toString() === id);
    if (existing !== undefined) {
      this.#activate(existing.id);
      return;
    }

    const task = this.#openNew(uri, id, options.preview === true);
    this.#opening.set(id, task);
    try {
      await task;
    } finally {
      this.#opening.delete(id);
    }
  }

  async restore(tabs: readonly OpenTab[]): Promise<void> {
    const failed: string[] = [];
    await Promise.all(
      tabs.map(async (tab) => {
        if (this.#descriptors.has(tab.id)) return;
        const provider = this.#providers.tryGet(tab.kind);
        const descriptor = provider === undefined ? undefined : await provider.openTab(tab.uri);
        if (descriptor === undefined) {
          failed.push(tab.id);
          return;
        }
        if (this.#containers.has(tab.id)) this.#descriptors.set(tab.id, descriptor);
      }),
    );
    if (failed.length > 0) this.#remove(new Set(failed));
    this.#changed.fire();
  }

  containerOf(tabId: string): Container {
    const container = this.#containers.get(tabId);
    if (container === undefined) throw new DescriptorNotFoundError(tabId);
    return container;
  }

  descriptorOf(tabId: string): TabDescriptor | undefined {
    return this.#descriptors.get(tabId);
  }

  hasAnyDirty(): boolean {
    for (const descriptor of this.#descriptors.values()) if (descriptor.isDirty) return true;
    return false;
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  dispose(): void {
    this.#subscription.dispose();
    for (const container of this.#containers.values()) container.dispose();
    this.#containers.clear();
    this.#descriptors.clear();
    this.#changed.dispose();
  }

  async #openNew(uri: URI, id: string, preview: boolean): Promise<void> {
    const providers = [...this.#providers.list()].sort((a, b) => b.priority - a.priority);
    for (const provider of providers) {
      const descriptor = await provider.openTab(uri);
      if (descriptor === undefined) continue;
      if (!this.#place({ id, kind: provider.id, uri, title: descriptor.title }, descriptor, preview)) return;
      this.#changed.fire();
      return;
    }
    this.#notifications.notify("error", `열 수 없다 — ${uri.toString()}`);
  }

  #place(tab: OpenTab, descriptor: TabDescriptor, preview: boolean): boolean {
    const tree = this.#layout.tree;
    const activeLeafId = this.#layout.activePaneId;
    if (findLeaf(tree, activeLeafId) === null) return false;

    this.#descriptors.set(tab.id, descriptor);
    const replaced = preview ? this.#layout.previewTabId : null;
    const nextTree = replaceLeaf(tree, activeLeafId, (leaf) => ({
      ...leaf,
      tabs: [...leaf.tabs.filter((open) => open.id !== replaced), tab],
      activeTabId: tab.id,
    }));
    if (preview) this.#layout.setPreviewTabId(tab.id);
    this.#layout.setTree(nextTree);
    return true;
  }

  #activate(tabId: string): void {
    const tree = this.#layout.tree;
    const leaf = leafOfTab(tree, tabId);
    if (leaf === null) return;
    if (this.#layout.previewTabId === tabId) this.#layout.setPreviewTabId(null);
    this.#layout.setTree(replaceLeaf(tree, leaf.id, (l) => ({ ...l, activeTabId: tabId })));
    this.#layout.setActivePaneId(leaf.id);
  }

  #remove(ids: ReadonlySet<string>): void {
    const pruned = pruneTree(withoutTabs(this.#layout.tree, ids)) ?? EMPTY_ROOT;
    const preview = this.#layout.previewTabId;
    if (preview !== null && ids.has(preview)) this.#layout.setPreviewTabId(null);
    this.#layout.setTree(pruned);
    const active = this.#layout.activePaneId;
    this.#layout.setActivePaneId(findLeaf(pruned, active) === null ? firstLeafId(pruned) : active);
  }

  #sync(): void {
    const ids = new Set(collectTabs(this.#layout.tree).map((tab) => tab.id));
    for (const id of ids) if (!this.#containers.has(id)) this.#containers.set(id, this.#root.createChild(`tab:${id}`));
    for (const [id, container] of this.#containers) {
      if (ids.has(id)) continue;
      container.dispose();
      this.#containers.delete(id);
      this.#descriptors.delete(id);
    }
  }
}
