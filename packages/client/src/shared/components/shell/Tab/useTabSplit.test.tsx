import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTabSplit } from './useTabSplit';
import type { TabTreeLeaf } from './Tab';

const ITEMS = [
  { id: 'a', title: 'A', iconId: 'file' },
  { id: 'b', title: 'B', iconId: 'file' },
];

describe('useTabSplit', () => {
  it('prunes empty leaves out of the visible tree', () => {
    const emptyLeaf: TabTreeLeaf = { kind: 'leaf', id: 'empty', activeTab: '', tabItems: [] };
    const fullLeaf: TabTreeLeaf = { kind: 'leaf', id: 'full', activeTab: 'a', tabItems: ITEMS as never };
    const { result } = renderHook(() =>
      useTabSplit({
        tree: { kind: 'split', id: 'root', orientation: 'horizontal', children: [emptyLeaf, fullLeaf] },
        onTabClick: vi.fn(),
        onMenuClick: vi.fn(),
      }),
    );

    expect(result.current.visibleTree).toEqual(fullLeaf);
  });

  it('exposes a shared context with no active resize/drop by default', () => {
    const leaf: TabTreeLeaf = { kind: 'leaf', id: 'only', activeTab: 'a', tabItems: ITEMS as never };
    const { result } = renderHook(() => useTabSplit({ tree: leaf, onTabClick: vi.fn(), onMenuClick: vi.fn() }));

    expect(result.current.context.dropIndicator).toBeNull();
    expect(result.current.context.resizingChildId).toBeNull();
  });
});
