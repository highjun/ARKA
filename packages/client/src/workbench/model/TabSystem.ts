import type { URI } from "#contracts";
import type { Container, Disposable } from "#core/di";
import { Emitter } from "#core/events";
import { DescriptorNotFoundError, type Registry } from "#core/registry";
import type { INotifications } from "./INotifications";
import type { ITabLayout, OpenTab, PaneNode } from "./ITabLayout";
import type { OpenOptions, TabDescriptor, TabProviderDescriptor } from "./ITabProviderDescriptor";
import type { ITabSystem } from "./ITabSystem";
import { collectTabs, findLeaf, firstLeafId, leafOfTab, pruneTree, replaceLeaf, withoutTabs } from "./paneTree";
import { ROOT_PANE_ID } from "./tabsShare";

/** 트리 전체가 빈 leaf 하나로 무너졌을 때 되돌아갈 자리 — `TabLayout`의 초기 상태와 같다. */
const EMPTY_ROOT: PaneNode = { kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null };

/**
 * `ITabSystem`의 유일한 구현체.
 *
 * 탭 id는 `uri.toString()`이다 — 같은 자원은 같은 탭이다. 자식 컨테이너는 `layout`의 탭 목록을 그대로
 * 따른다: 목록에 생기면 따고, 빠지면 `dispose`한다. descriptor는 provider가 답한 순간 담고, 탭이 빠질 때 버린다.
 */
export class TabSystem implements ITabSystem, Disposable {
  readonly #layout: ITabLayout;
  readonly #providers: Registry<TabProviderDescriptor>;
  readonly #notifications: INotifications;
  readonly #root: Container;
  readonly #descriptors = new Map<string, TabDescriptor>();
  readonly #containers = new Map<string, Container>();
  /** 같은 uri를 연달아 열면 두 번째는 첫 번째가 끝나기를 기다린다 — 그래야 복제 대신 고정이 된다. */
  readonly #opening = new Map<string, Promise<void>>();
  readonly #changed = new Emitter();
  readonly #subscription: Disposable;

  /** 이미 목록에 있는 탭(복원된 것)의 컨테이너를 바로 딴다 — `restore`는 따로 부른다. */
  constructor({
    layout,
    providers,
    notifications,
    root,
  }: {
    layout: ITabLayout;
    providers: Registry<TabProviderDescriptor>;
    notifications: INotifications;
    /** 탭 컨테이너의 부모. 앱 루트다 — 탭 안에서 `useViewModel`로 꺼내는 것이 셸이 보는 것과 같은 인스턴스가 된다. */
    root: Container;
  }) {
    this.#layout = layout;
    this.#providers = providers;
    this.#notifications = notifications;
    this.#root = root;
    this.#sync();
    this.#subscription = layout.onDidChange(() => this.#sync());
  }

  /** 이미 열려 있으면 활성화(미리보기였으면 고정)로 끝난다. 아니면 provider를 `priority` 내림차순으로 돈다. */
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

  /** 탭마다 `kind`의 provider에게 다시 묻는다. 그릴 것이 이미 있는 탭은 건너뛰고, 못 연 탭은 뺀다. */
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
        // 기다리는 사이 닫혔을 수 있다 — 목록에 없으면 버린다.
        if (this.#containers.has(tab.id)) this.#descriptors.set(tab.id, descriptor);
      }),
    );
    if (failed.length > 0) this.#remove(new Set(failed));
    this.#changed.fire();
  }

  /** 목록에 있는 탭이면 언제나 있다 — 목록에서 파생하기 때문이다. */
  containerOf(tabId: string): Container {
    const container = this.#containers.get(tabId);
    if (container === undefined) throw new DescriptorNotFoundError(tabId);
    return container;
  }

  /** provider가 아직 답하지 않은 탭(복원 중)은 `undefined`다. */
  descriptorOf(tabId: string): TabDescriptor | undefined {
    return this.#descriptors.get(tabId);
  }

  /** 담긴 descriptor의 `isDirty`를 읽기만 한다 — 관찰하지 않는다. */
  hasAnyDirty(): boolean {
    for (const descriptor of this.#descriptors.values()) if (descriptor.isDirty) return true;
    return false;
  }

  /** `restore`가 끝났을 때, 그리고 탭이 열리고 닫힐 때 부른다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  /** 탭 컨테이너를 전부 정리한다. 앱 컨테이너가 이것을 정리할 때 불린다. */
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

  /**
   * 지금 활성 pane에 놓는다. 미리보기는 **자리 하나**다 — 밀어내는 게 아니라 갈아끼운다. 옛 미리보기 탭이 이
   * pane에 있으면 걷어내고, 다른 pane에 있으면 건드리지 않는다 — 안 보고 있는 pane의 탭을 이 pane의 조작만으로
   * 지우는 건 예상 못 할 부작용이다(그 탭은 조용히 고정된 채로 남는다).
   */
  #place(tab: OpenTab, descriptor: TabDescriptor, preview: boolean): boolean {
    const tree = this.#layout.tree;
    const activeLeafId = this.#layout.activePaneId;
    // activePaneId는 항상 존재하는 leaf를 가리킨다(불변) — 방어적으로만 무시한다.
    if (findLeaf(tree, activeLeafId) === null) return false;

    // descriptor를 먼저 담는다 — 트리가 바뀌는 순간 화면이 이미 그릴 것을 찾는다.
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

  /** 그 탭이 있는 pane으로 포커스를 옮기고 활성으로 만든다. 미리보기 자리였으면 고정한다 — 한 번 더 열면 고정된다. */
  #activate(tabId: string): void {
    const tree = this.#layout.tree;
    const leaf = leafOfTab(tree, tabId);
    if (leaf === null) return;
    if (this.#layout.previewTabId === tabId) this.#layout.setPreviewTabId(null);
    this.#layout.setTree(replaceLeaf(tree, leaf.id, (l) => ({ ...l, activeTabId: tabId })));
    this.#layout.setActivePaneId(leaf.id);
  }

  /** 못 연 탭을 트리에서 빼고 빈 pane을 걷어낸다. 포커스가 사라진 pane에 있었으면 첫 pane으로. */
  #remove(ids: ReadonlySet<string>): void {
    const pruned = pruneTree(withoutTabs(this.#layout.tree, ids)) ?? EMPTY_ROOT;
    const preview = this.#layout.previewTabId;
    if (preview !== null && ids.has(preview)) this.#layout.setPreviewTabId(null);
    this.#layout.setTree(pruned);
    const active = this.#layout.activePaneId;
    this.#layout.setActivePaneId(findLeaf(pruned, active) === null ? firstLeafId(pruned) : active);
  }

  /** 컨테이너 목록을 탭 목록에 맞춘다 — 생긴 탭은 따고, 빠진 탭은 정리한다. */
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
