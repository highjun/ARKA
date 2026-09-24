import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTabStrip } from "./useTabStrip";
import type { TabItem } from "./index";

const item = (id: string): TabItem => ({ id, title: id.toUpperCase(), icon: null });
const ITEMS: TabItem[] = [item("a"), item("b")];

describe("useTabStrip", () => {
  it("onItemMove 를 생략하면 끌어 옮길 수 없다", () => {
    const { result } = renderHook(() => useTabStrip({ items: ITEMS, activeItemId: "a" }));
    expect(result.current.context.movable).toBe(false);
  });

  it("drop 표시선이 없으면 순서 변경을 확정하지 않는다", () => {
    const onItemMove = vi.fn();
    const { result } = renderHook(() => useTabStrip({ items: ITEMS, activeItemId: "a", onItemMove }));

    const dataTransfer = { getData: () => "", dropEffect: "move" as const };
    act(() => {
      result.current.listHandlers.onDrop({
        preventDefault: () => {},
        dataTransfer,
      } as unknown as Parameters<typeof result.current.listHandlers.onDrop>[0]);
    });

    expect(onItemMove).not.toHaveBeenCalled();
  });

  it("Shift+화살표로 순서를 바꾸면 꽂을 자리가 탭 id 로 온다", () => {
    const onItemMove = vi.fn();
    const { result } = renderHook(() => useTabStrip({ items: ITEMS, activeItemId: "a", onItemMove }));

    result.current.context.onKeyDown(
      { key: "ArrowRight", shiftKey: true, preventDefault: () => {} } as unknown as Parameters<
        typeof result.current.context.onKeyDown
      >[0],
      ITEMS[0]!,
    );

    // a 를 오른쪽으로 한 칸 — a 를 뺀 목록에서 그 다음 자리는 없으니 맨 뒤다.
    expect(onItemMove).toHaveBeenCalledWith("a", null);
  });
});
