import { describe, expect, it } from "vitest";
import { URI } from "#contracts";
import type { OpenTab, PaneNode, PaneSplit } from "./ITabLayout";
import { collectTabs, findLeaf, firstLeafId, neighbourOf, pruneTree, replaceLeaf } from "./paneTree";

const tab = (id: string): OpenTab => ({ id, kind: "file", uri: URI.file(id), title: id });
const leaf = (id: string, ...tabs: OpenTab[]): PaneNode => ({
  kind: "leaf",
  id,
  tabs,
  activeTabId: tabs[0]?.id ?? null,
});
const split = (id: string, ...children: PaneNode[]): PaneSplit => ({
  kind: "split",
  id,
  orientation: "horizontal",
  children,
});

describe("paneTree", () => {
  it("findLeaf는 깊이와 무관하게 잎을 찾고 없으면 null이다", () => {
    const tree = split("s", leaf("a", tab("1")), split("s2", leaf("b", tab("2"))));

    expect(findLeaf(tree, "b")?.id).toBe("b");
    expect(findLeaf(tree, "zzz")).toBeNull();
  });

  it("replaceLeaf는 그 잎만 바꾸고 나머지 참조는 유지한다", () => {
    const a = leaf("a", tab("1"));
    const tree = split("s", a, leaf("b", tab("2")));

    const next = replaceLeaf(tree, "b", (l) => ({ ...l, tabs: [] }));

    expect(next.kind === "split" && next.children[0]).toBe(a);
    expect(findLeaf(next, "b")?.tabs).toEqual([]);
  });

  it("pruneTree는 빈 잎을 걷고 자식 하나짜리 split을 그 자식으로 접는다", () => {
    const tree: PaneNode = {
      kind: "split",
      id: "s",
      orientation: "vertical",
      size: 0.4,
      children: [leaf("a"), leaf("b", tab("2"))],
    };

    expect(pruneTree(tree)).toEqual({ ...leaf("b", tab("2")), size: 0.4 });
    expect(pruneTree(leaf("empty"))).toBeNull();
  });

  it("firstLeafId는 그리는 순서로 첫 잎이다", () => {
    expect(firstLeafId(split("s", split("s2", leaf("x", tab("1"))), leaf("y")))).toBe("x");
  });

  it("collectTabs는 그리는 순서로 탭 전부다", () => {
    const tree = split("s", leaf("a", tab("1"), tab("2")), leaf("b", tab("3")));

    expect(collectTabs(tree).map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("neighbourOf는 오른쪽 먼저, 없으면 왼쪽, 아무도 없으면 null", () => {
    const tabs = [tab("a"), tab("c")];

    expect(neighbourOf(tabs, 1)).toBe("c");
    expect(neighbourOf(tabs, 2)).toBe("c");
    expect(neighbourOf([], 0)).toBeNull();
  });
});
