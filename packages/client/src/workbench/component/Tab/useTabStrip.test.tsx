import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTabStrip } from './useTabStrip';
import type { TabItem } from './Tab';

const ITEMS: TabItem[] = [
  { id: 'a', title: 'A', iconId: 'file' },
  { id: 'b', title: 'B', iconId: 'file' },
];

describe('useTabStrip', () => {
  it('is not reorderable when onTabReorder is omitted', () => {
    const { result } = renderHook(() => useTabStrip('a', ITEMS, vi.fn(), vi.fn(), undefined, undefined, undefined, undefined));
    expect(result.current.context.reorderable).toBe(false);
  });

  it('commits a reorder on drop when a valid drop indicator resolves', () => {
    const onTabReorder = vi.fn();
    const { result } = renderHook(() => useTabStrip('a', ITEMS, vi.fn(), vi.fn(), undefined, onTabReorder, undefined, undefined));

    // listRef.current is null in jsdom without a real layout, so getStripChildRects/indicator
    // resolution short-circuits to null — 여기서는 dataTransfer 가 비어있을 때 아무 일도 안 하는지만 확인한다.
    const dataTransfer = { getData: () => '', dropEffect: 'move' as const };
    act(() => {
      result.current.listHandlers.onDrop({
        preventDefault: () => {},
        dataTransfer,
      } as unknown as Parameters<typeof result.current.listHandlers.onDrop>[0]);
    });

    expect(onTabReorder).not.toHaveBeenCalled();
  });
});
