import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTabSplit } from './useTabSplit';
import type { TabTreeLeaf } from './Tab';

const ITEMS = [
  { id: 'a', title: 'A', iconId: 'file' },
  { id: 'b', title: 'B', iconId: 'file' },
];

describe('useTabSplit', () => {
  it('빈 leaf 는 visibleTree 에서 잘라낸다', () => {
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

  it('기본 상태의 공유 context 에는 진행 중인 resize/drop 이 없다', () => {
    const leaf: TabTreeLeaf = { kind: 'leaf', id: 'only', activeTab: 'a', tabItems: ITEMS as never };
    const { result } = renderHook(() => useTabSplit({ tree: leaf, onTabClick: vi.fn(), onMenuClick: vi.fn() }));

    expect(result.current.context.dropIndicator).toBeNull();
    expect(result.current.context.resizingChildId).toBeNull();
  });
});
