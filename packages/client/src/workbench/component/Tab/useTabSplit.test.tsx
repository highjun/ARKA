import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTabSplit } from "./useTabSplit";
import type { PaneRowLeaf, TabRow } from "./Tab";

const row = (id: string): TabRow => ({
  id,
  kind: "file",
  title: id.toUpperCase(),
  icon: null,
  Content: () => null,
  isPreview: false,
  isDirty: false,
});
const ROWS = [row("a"), row("b")];

describe("useTabSplit", () => {
  it("빈 leaf 는 visibleTree 에서 잘라낸다", () => {
    const emptyLeaf: PaneRowLeaf = { kind: "leaf", id: "empty", activeTabId: null, tabs: [] };
    const fullLeaf: PaneRowLeaf = { kind: "leaf", id: "full", activeTabId: "a", tabs: ROWS };
    const { result } = renderHook(() =>
      useTabSplit({
        tree: { kind: "split", id: "root", orientation: "horizontal", children: [emptyLeaf, fullLeaf] },
        activePaneId: "full",
      }),
    );

    expect(result.current.visibleTree).toEqual(fullLeaf);
  });

  it("기본 상태의 공유 context 에는 진행 중인 resize/drop 이 없다", () => {
    const leaf: PaneRowLeaf = { kind: "leaf", id: "only", activeTabId: "a", tabs: ROWS };
    const { result } = renderHook(() => useTabSplit({ tree: leaf, activePaneId: "only" }));

    expect(result.current.context.dropIndicator).toBeNull();
    expect(result.current.context.resizingChildId).toBeNull();
  });
});
