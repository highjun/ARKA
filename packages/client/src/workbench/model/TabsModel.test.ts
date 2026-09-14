import { ROOT_PANE_ID } from "../model/tabsShare";
import type { TabPaneNode } from "../model/ITabsModel";
import type { OpenTab } from "../model/ITabsModel";
import type { ITabsModel } from "../model/ITabsModel";
import { TabsModel } from "../model/TabsModel";
import type { IStorage } from "../model/IStorage";

/** 실제 `localStorage` 대신 메모리 하나로 — 계약(get/set)만 있으면 Model이 알 필요 없다. */
const fakeStorage = (seed: Record<string, string> = {}): IStorage => {
  const store = new Map(Object.entries(seed));
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
  };
};

const make = (storage: IStorage = fakeStorage()): ITabsModel => {
  return new TabsModel({ storage });
};

const tab = (id: string): OpenTab => ({ id, kind: "file", title: id });
const rootLeaf = (tabs: readonly OpenTab[], activeTabId: string | null = null): TabPaneNode => ({
  kind: "leaf",
  id: ROOT_PANE_ID,
  tabs,
  activeTabId,
});

describe("ITabsModel — 값을 그대로 반영한다", () => {
  it("빈 루트 leaf로 시작한다", () => {
    const model = make();

    expect(model.tree).toEqual(rootLeaf([]));
    expect(model.activeLeafId).toBe(ROOT_PANE_ID);
    expect(model.previewTabId).toBeNull();
  });

  it("setTree가 넘어온 트리를 그대로 담는다 — 계산하지 않는다", () => {
    const model = make();
    const tree = rootLeaf([tab("a"), tab("b")], "a");

    model.setTree(tree);

    expect(model.tree).toEqual(tree);
  });

  it("setActiveLeafId가 넘어온 값을 그대로 담는다", () => {
    const model = make();

    model.setActiveLeafId("pane-2");

    expect(model.activeLeafId).toBe("pane-2");
  });

  it("setPreviewTabId가 넘어온 값을 그대로 담는다", () => {
    const model = make();

    model.setPreviewTabId("a");

    expect(model.previewTabId).toBe("a");
  });
});

describe("ITabsModel — 지속", () => {
  it("setTree 할 때마다 저장한다", () => {
    const storage = fakeStorage();
    const model = make(storage);
    const tree = rootLeaf([tab("a")], "a");

    model.setTree(tree);

    expect(storage.get("workbench.tabTree")).toBe(JSON.stringify(tree));
  });

  it("setActiveLeafId(null 아님, 항상 문자열)를 그대로 저장한다", () => {
    const storage = fakeStorage();
    const model = make(storage);

    model.setActiveLeafId("pane-2");

    expect(storage.get("workbench.activeLeafId")).toBe("pane-2");
  });

  it("setPreviewTabId(null)은 빈 문자열로 저장한다 — localStorage는 null을 못 담는다", () => {
    const storage = fakeStorage();
    const model = make(storage);

    model.setPreviewTabId("a");
    model.setPreviewTabId(null);

    expect(storage.get("workbench.previewTabId")).toBe("");
  });

  it("부팅 시 저장된 트리로 복원한다", () => {
    const tree = rootLeaf([tab("a"), tab("b")], "b");
    const storage = fakeStorage({
      "workbench.tabTree": JSON.stringify(tree),
      "workbench.activeLeafId": ROOT_PANE_ID,
      "workbench.previewTabId": "",
    });

    const model = make(storage);

    expect(model.tree).toEqual(tree);
    expect(model.activeLeafId).toBe(ROOT_PANE_ID);
    expect(model.previewTabId).toBeNull();
  });

  it("저장된 트리가 깨져 있으면 빈 루트 leaf로 시작한다", () => {
    const storage = fakeStorage({ "workbench.tabTree": "{망가진 json" });

    expect(make(storage).tree).toEqual(rootLeaf([]));
  });

  it("트리 데이터가 없고 leaf/split 모양도 아니면 빈 루트 leaf로 시작한다", () => {
    const storage = fakeStorage({ "workbench.tabTree": JSON.stringify({ nonsense: true }) });

    expect(make(storage).tree).toEqual(rootLeaf([]));
  });
});

describe("ITabsModel — 구 스키마(트리 도입 전) 마이그레이션", () => {
  it("새 트리 키가 없으면 구 flat 배열을 단일 루트 leaf로 이식한다", () => {
    const storage = fakeStorage({
      "workbench.tabs": JSON.stringify([tab("a"), tab("b")]),
      "workbench.activeTabId": "b",
    });

    const model = make(storage);

    expect(model.tree).toEqual(rootLeaf([tab("a"), tab("b")], "b"));
  });

  it("구 데이터도 없으면 빈 루트 leaf로 시작한다", () => {
    expect(make().tree).toEqual(rootLeaf([]));
  });

  it("구 flat 배열이 깨져 있으면 빈 탭으로 이식한다", () => {
    const storage = fakeStorage({ "workbench.tabs": "{망가진 json" });

    expect(make(storage).tree).toEqual(rootLeaf([]));
  });
});
