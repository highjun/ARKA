import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { IStorage } from '../model/IStorage';
import { ROOT_PANE_ID } from './tabsShare';
import type { OpenTab, PaneId, TabPaneNode, ITabsModel } from './ITabsModel';

/** `ITabsModel`의 유일한 구현체 — 트리·활성 leaf·미리보기를 `IStorage`에 지속하고, 구 스키마(flat 배열)를 트리로 이식한다. */
export class TabsModel implements ITabsModel {
  static readonly #TREE_KEY = 'workbench.tabTree';
  static readonly #ACTIVE_LEAF_ID_KEY = 'workbench.activeLeafId';
  static readonly #PREVIEW_TAB_ID_KEY = 'workbench.previewTabId';
  // 마이그레이션 전용 — 트리 도입 전(2026-08-31 이전) 버전이 쓰던 키. 새로 쓰지 않는다, 지우지도
  // 않는다(구버전으로 롤백하는 경로를 굳이 막을 이유가 없다).
  static readonly #LEGACY_TABS_KEY = 'workbench.tabs';
  static readonly #LEGACY_ACTIVE_TAB_ID_KEY = 'workbench.activeTabId';

  readonly #storage: IStorage;
  #tree: TabPaneNode;
  #activeLeafId: PaneId;
  #previewTabId: string | null;

  /** 새로고침해도 탭이 남아 있어야 이 앱을 쓸 이유가 성립한다 — 그래서 값 셋 다 부팅 시 복원한다. */
  constructor({ storage }: { storage: IStorage }) {
    this.#storage = storage;
    this.#tree = TabsModel.#restoreTree(storage);
    this.#activeLeafId = TabsModel.#restoreActiveLeafId(storage);
    this.#previewTabId = TabsModel.#restoreId(storage, TabsModel.#PREVIEW_TAB_ID_KEY);
  }

  /** `#tree`를 그대로 노출한다. */
  get tree() {
    return this.#tree;
  }

  /** `#tree`에 반영하고 `IStorage`에 지속한다. */
  setTree(tree: TabPaneNode): void {
    this.#setTree(tree);
    this.#storage.set(TabsModel.#TREE_KEY, JSON.stringify(tree));
  }

  /** `#activeLeafId`를 그대로 노출한다. */
  get activeLeafId() {
    return this.#activeLeafId;
  }

  /** `#activeLeafId`에 반영하고 `IStorage`에 지속한다. */
  setActiveLeafId(id: PaneId): void {
    this.#setActiveLeafId(id);
    this.#storage.set(TabsModel.#ACTIVE_LEAF_ID_KEY, id);
  }

  /** `#previewTabId`를 그대로 노출한다. */
  get previewTabId() {
    return this.#previewTabId;
  }

  /** `#previewTabId`에 반영하고 `IStorage`에 지속한다. */
  setPreviewTabId(id: string | null): void {
    this.#setPreviewTabId(id);
    this.#storage.set(TabsModel.#PREVIEW_TAB_ID_KEY, id ?? '');
  }

  /** 새 스키마(트리)를 먼저 읽는다. 없거나 깨졌으면 구 스키마(flat 배열)를 단일 루트 leaf로
   * 이식한다 — 사용자가 열어 둔 탭을 잃지 않는다. 둘 다 없으면 빈 루트 leaf로 시작한다. */
  static #restoreTree(storage: IStorage): TabPaneNode {
    const raw = storage.get(TabsModel.#TREE_KEY);
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (TabsModel.#isPaneNode(parsed)) return parsed;
      } catch {
        // 새 스키마 파싱 실패 — 아래에서 구 스키마 이식을 시도한다.
      }
    }
    return TabsModel.#migrateLegacyTree(storage);
  }

  static #migrateLegacyTree(storage: IStorage): TabPaneNode {
    const tabs = TabsModel.#parseLegacyTabs(storage.get(TabsModel.#LEGACY_TABS_KEY));
    const activeTabId = TabsModel.#restoreId(storage, TabsModel.#LEGACY_ACTIVE_TAB_ID_KEY);
    return { kind: 'leaf', id: ROOT_PANE_ID, tabs, activeTabId };
  }

  static #parseLegacyTabs(raw: string | null): readonly OpenTab[] {
    if (raw === null) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as OpenTab[]) : [];
    } catch {
      return [];
    }
  }

  /** 얕은 판정이다(`kind`만 본다) — 구 코드의 flat 배열 판정(`Array.isArray`만 봄)과 같은 깊이다.
   * 저장한 값은 우리 자신이 `setTree`로 직렬화한 것뿐이라 더 깊이 검증할 위협 모델이 없다. */
  static #isPaneNode(value: unknown): value is TabPaneNode {
    if (typeof value !== 'object' || value === null) return false;
    const kind = (value as { kind?: unknown }).kind;
    return kind === 'leaf' || kind === 'split';
  }

  static #restoreActiveLeafId(storage: IStorage): PaneId {
    const raw = storage.get(TabsModel.#ACTIVE_LEAF_ID_KEY);
    return raw === null || raw === '' ? ROOT_PANE_ID : raw;
  }

  /** 저장할 때 빈 문자열을 "없다"로 쓴다 — `localStorage`는 `null`을 값으로 담을 수 없다. */
  static #restoreId(storage: IStorage, key: string): string | null {
    const raw = storage.get(key);
    return raw === null || raw === '' ? null : raw;
  }

  readonly #changed = new Emitter();

  #setTree(next: TabPaneNode): void {
    if (this.#tree === next) return;
    this.#tree = next;
    this.#changed.fire();
  }

  #setActiveLeafId(next: PaneId): void {
    if (this.#activeLeafId === next) return;
    this.#activeLeafId = next;
    this.#changed.fire();
  }

  #setPreviewTabId(next: string | null): void {
    if (this.#previewTabId === next) return;
    this.#previewTabId = next;
    this.#changed.fire();
  }

  /** 상태가 바뀔 때마다 부른다. ViewModel이 이걸 받아 자기 atom을 갱신한다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

}
