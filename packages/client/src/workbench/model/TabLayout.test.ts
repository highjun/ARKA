import { describe, expect, it } from "vitest";
import { URI } from "#contracts";
import type { IStorage } from "./IStorage";
import type { ITabLayout, OpenTab, PaneNode } from "./ITabLayout";
import { TabLayout } from "./TabLayout";
import { ROOT_PANE_ID } from "./tabsShare";

const fakeStorage = (seed: Record<string, string> = {}): IStorage => {
  const store = new Map(Object.entries(seed));
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
  };
};

const make = (storage: IStorage = fakeStorage()): ITabLayout => new TabLayout({ storage });

const tabsOf = (node: PaneNode): readonly OpenTab[] => (node.kind === "leaf" ? node.tabs : []);

const tab = (id: string): OpenTab => ({ id, kind: "arka.filesystem.text", uri: URI.file(id), title: id });
const rootLeaf = (tabs: readonly OpenTab[], activeTabId: string | null = null): PaneNode => ({
  kind: "leaf",
  id: ROOT_PANE_ID,
  tabs,
  activeTabId,
});

describe("ITabLayout — 값을 그대로 반영한다", () => {
  it("빈 루트 leaf로 시작한다", () => {
    const layout = make();

    expect(layout.tree).toEqual(rootLeaf([]));
    expect(layout.activePaneId).toBe(ROOT_PANE_ID);
    expect(layout.previewTabId).toBeNull();
  });

  it("setTree가 넘어온 트리를 그대로 담는다 — 계산하지 않는다", () => {
    const layout = make();
    const tree = rootLeaf([tab("a"), tab("b")], "a");

    layout.setTree(tree);

    expect(layout.tree).toBe(tree);
  });

  it("setActivePaneId·setPreviewTabId가 넘어온 값을 그대로 담는다", () => {
    const layout = make();

    layout.setActivePaneId("pane-2");
    layout.setPreviewTabId("a");

    expect(layout.activePaneId).toBe("pane-2");
    expect(layout.previewTabId).toBe("a");
  });
});

describe("ITabLayout — 지속", () => {
  it("setTree는 uri를 문자열로 저장한다", () => {
    const storage = fakeStorage();
    make(storage).setTree(rootLeaf([tab("docs/a.md")], "docs/a.md"));

    expect(JSON.parse(storage.get("workbench.tabTree") ?? "")).toEqual({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [{ id: "docs/a.md", kind: "arka.filesystem.text", uri: "file:///docs/a.md", title: "docs/a.md" }],
      activeTabId: "docs/a.md",
    });
  });

  it("setPreviewTabId(null)은 빈 문자열로 저장한다 — localStorage는 null을 못 담는다", () => {
    const storage = fakeStorage();
    const layout = make(storage);

    layout.setPreviewTabId("a");
    layout.setPreviewTabId(null);

    expect(storage.get("workbench.previewTabId")).toBe("");
  });

  it("부팅 시 저장된 트리로 복원한다 — uri는 다시 URI가 된다", () => {
    const storage = fakeStorage();
    const tree = rootLeaf([tab("a"), tab("b")], "b");
    make(storage).setTree(tree);

    const restored = make(storage);

    expect(restored.tree).toEqual(tree);
    expect(tabsOf(restored.tree)[0]?.uri).toBeInstanceOf(URI);
  });

  it("저장된 트리가 깨져 있으면 빈 루트 leaf로 시작한다", () => {
    expect(make(fakeStorage({ "workbench.tabTree": "{망가진 json" })).tree).toEqual(rootLeaf([]));
    expect(make(fakeStorage({ "workbench.tabTree": JSON.stringify({ nonsense: true }) })).tree).toEqual(rootLeaf([]));
  });
});
