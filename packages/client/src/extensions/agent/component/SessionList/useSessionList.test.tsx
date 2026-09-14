import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSessionList } from "./useSessionList";
import type { AgentSession } from "./SessionList";

const SESSION_A: AgentSession = { id: "a", title: "첫 세션" };
const SESSION_B_DISABLED: AgentSession = { id: "b", title: "둘째 세션", disabled: true };

describe("useSessionList", () => {
  it("시작값 없이는 activeId가 undefined다", () => {
    const { result } = renderHook(() => useSessionList({}));

    expect(result.current.activeId).toBeUndefined();
  });

  it("defaultActiveId를 시작값으로 갖는다", () => {
    const { result } = renderHook(() => useSessionList({ defaultActiveId: "a" }));

    expect(result.current.activeId).toBe("a");
  });

  it("uncontrolled: selectSession으로 activeId가 바뀌고 onActiveChange가 불린다", () => {
    const onActiveChange = vi.fn();
    const { result } = renderHook(() => useSessionList({ onActiveChange }));

    act(() => result.current.selectSession(SESSION_A));

    expect(result.current.activeId).toBe("a");
    expect(onActiveChange).toHaveBeenCalledWith(SESSION_A);
  });

  it("disabled 세션은 selectSession을 호출해도 무시된다", () => {
    const onActiveChange = vi.fn();
    const { result } = renderHook(() => useSessionList({ onActiveChange }));

    act(() => result.current.selectSession(SESSION_B_DISABLED));

    expect(result.current.activeId).toBeUndefined();
    expect(onActiveChange).not.toHaveBeenCalled();
  });

  it("controlled: activeId를 넘기면 selectSession을 호출해도 내부적으로 바뀌지 않는다", () => {
    const onActiveChange = vi.fn();
    const { result, rerender } = renderHook(({ activeId }) => useSessionList({ activeId, onActiveChange }), {
      initialProps: { activeId: "a" },
    });

    act(() => result.current.selectSession({ id: "c", title: "셋째 세션" }));
    rerender({ activeId: "a" });

    expect(result.current.activeId).toBe("a");
    expect(onActiveChange).toHaveBeenCalledWith(expect.objectContaining({ id: "c" }));
  });
});
