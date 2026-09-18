import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTabStrip } from "./useTabStrip";
import type { TabRow } from "./Tab";

const row = (id: string): TabRow => ({
  id,
  kind: "file",
  title: id.toUpperCase(),
  icon: null,
  Content: () => null,
  isPreview: false,
  isDirty: false,
});
const ROWS: TabRow[] = [row("a"), row("b")];

describe("useTabStrip", () => {
  it("onReorder 를 생략하면 순서를 바꿀 수 없다", () => {
    const { result } = renderHook(() => useTabStrip({ tabs: ROWS, activeTabId: "a" }));
    expect(result.current.context.reorderable).toBe(false);
  });

  it("drop 표시선이 없으면 순서 변경을 확정하지 않는다", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useTabStrip({ tabs: ROWS, activeTabId: "a", onReorder }));

    // jsdom엔 실제 배치가 없어 listRef.current가 null이다 — 표시선이 안 잡히면 아무 일도 없어야 한다.
    const dataTransfer = { getData: () => "", dropEffect: "move" as const };
    act(() => {
      result.current.listHandlers.onDrop({
        preventDefault: () => {},
        dataTransfer,
      } as unknown as Parameters<typeof result.current.listHandlers.onDrop>[0]);
    });

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("Shift+화살표로 순서를 바꾸면 새 id 순서가 온다", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useTabStrip({ tabs: ROWS, activeTabId: "a", onReorder }));

    result.current.context.onKeyDown(
      { key: "ArrowRight", shiftKey: true, preventDefault: () => {} } as unknown as Parameters<
        typeof result.current.context.onKeyDown
      >[0],
      ROWS[0]!,
    );

    expect(onReorder).toHaveBeenCalledWith(["b", "a"]);
  });
});
