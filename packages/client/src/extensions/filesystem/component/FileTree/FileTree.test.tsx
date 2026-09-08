import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { FileTree } from './FileTree';

const ITEMS = [
  {
    id: 'src',
    name: 'src',
    type: 'folder' as const,
    children: [{ id: 'main', name: 'main.ts', type: 'file' as const }],
  },
];

// `src`에 폴더 자식이 둘 있어(components, styles) 압축(`compactFolderChains`) 대상이 아니다 —
// 이 픽스처는 압축이 아니라 평범한 3단 중첩(aria-level 등)을 검사하려는 것이다.
const NESTED_ITEMS = [
  {
    id: 'src',
    name: 'src',
    type: 'folder' as const,
    children: [
      {
        id: 'components',
        name: 'components',
        type: 'folder' as const,
        children: [{ id: 'button', name: 'Button.tsx', type: 'file' as const }],
      },
      { id: 'styles', name: 'styles.css', type: 'file' as const },
    ],
  },
];

const TWO_ITEMS = [
  { id: 'a', name: 'a.ts', type: 'file' as const },
  { id: 'b', name: 'b.ts', type: 'file' as const },
];

const THREE_ITEMS = [
  { id: 'a', name: 'a.ts', type: 'file' as const },
  { id: 'b', name: 'b.ts', type: 'file' as const },
  { id: 'c', name: 'c.ts', type: 'file' as const },
];

const isSelected = (name: string) => screen.getByRole('treeitem', { name }).getAttribute('aria-selected') === 'true';

describe('FileTree', () => {
  implementsClassName((extra) => <FileTree items={ITEMS} {...extra} />);
  implementsDataComponent((extra) => <FileTree items={ITEMS} {...extra} />, 'FileTree');
  implementsForwardRef((extra) => <FileTree items={ITEMS} {...extra} />, HTMLUListElement);
  implementsNoA11yViolations(() => <FileTree items={ITEMS} expandedIds={['src']} selectedIds={['main']} />);

  describe('Markup', () => {
    it('트리 루트는 role="tree", 각 행은 role="treeitem"이다', () => {
      render(<FileTree items={ITEMS} />);

      expect(screen.getByRole('tree')).toBeInTheDocument();
      expect(screen.getByRole('treeitem', { name: 'src' })).toBeInTheDocument();
    });

    it('role="tree"에 aria-multiselectable="true"가 있다', () => {
      render(<FileTree items={ITEMS} />);

      expect(screen.getByRole('tree')).toHaveAttribute('aria-multiselectable', 'true');
    });

    it('펼쳐진 폴더의 자식은 role="group"인 <ul>에 담긴다', () => {
      render(<FileTree items={ITEMS} expandedIds={['src']} />);

      const group = screen.getByRole('group');
      expect(group.tagName).toBe('UL');
      expect(group).toContainElement(screen.getByRole('treeitem', { name: 'main.ts' }));
    });

    it('aria-level이 중첩 깊이를 반영한다', () => {
      render(<FileTree items={NESTED_ITEMS} expandedIds={['src', 'components']} />);

      expect(screen.getByRole('treeitem', { name: 'src' })).toHaveAttribute('aria-level', '1');
      expect(screen.getByRole('treeitem', { name: 'components' })).toHaveAttribute('aria-level', '2');
      expect(screen.getByRole('treeitem', { name: 'Button.tsx' })).toHaveAttribute('aria-level', '3');
    });

    it('폴더의 aria-expanded가 펼침 상태를 반영한다', () => {
      const { rerender } = render(<FileTree items={ITEMS} />);

      expect(screen.getByRole('treeitem', { name: 'src' })).toHaveAttribute('aria-expanded', 'false');

      rerender(<FileTree items={ITEMS} expandedIds={['src']} />);

      expect(screen.getByRole('treeitem', { name: 'src' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('파일 행에는 aria-expanded가 없다', () => {
      render(<FileTree items={ITEMS} expandedIds={['src']} />);

      expect(screen.getByRole('treeitem', { name: 'main.ts' })).not.toHaveAttribute('aria-expanded');
    });

    it('선택된 행에 aria-selected="true", 나머지는 "false"를 낸다', () => {
      render(<FileTree items={TWO_ITEMS} selectedIds={['a']} />);

      expect(screen.getByRole('treeitem', { name: 'a.ts' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('treeitem', { name: 'b.ts' })).toHaveAttribute('aria-selected', 'false');
    });

    it('disabled 행에는 aria-selected가 없다', () => {
      render(<FileTree items={[{ id: 'locked', name: 'locked.md', type: 'file', disabled: true }]} />);

      expect(screen.getByRole('treeitem', { name: 'locked.md' })).not.toHaveAttribute('aria-selected');
    });

    it('disabled 행을 aria-disabled로 노출한다', () => {
      render(<FileTree items={[{ id: 'locked', name: 'locked.md', type: 'file', disabled: true }]} />);

      expect(screen.getByRole('treeitem', { name: 'locked.md' })).toHaveAttribute('aria-disabled', 'true');
    });

    it('파일 행에만 확장자별 FileIcon(data-file-icon)이 있다', () => {
      render(<FileTree items={ITEMS} expandedIds={['src']} />);

      const rows = screen.getAllByRole('treeitem');
      const srcRow = rows.find((row) => row.id === 'src');
      const mainRow = rows.find((row) => row.id === 'main');

      // 각 <li>는 자기 row div와 중첩 서브트리 <ul>을 형제로 두므로, `:scope > div`로 좁히지
      // 않으면 펼쳐진 자식의 아이콘까지 같이 잡힌다.
      expect(srcRow?.querySelector(':scope > div [data-file-icon]')).toBeNull();
      expect(mainRow?.querySelector(':scope > div [data-file-icon]')).toHaveAttribute('data-file-icon', 'fileTypeTs');
    });

    it('로딩 중인 행은 자기 자신 위에 Circular Progress를 보여준다 — 별도 안내 행을 만들지 않는다', () => {
      render(
        <FileTree
          items={[{ id: 'src', name: 'src', type: 'folder', loading: true, children: [] }]}
          expandedIds={['src']}
        />,
      );

      const row = screen.getByRole('treeitem', { name: 'src' });
      expect(row.querySelector(':scope > div [data-icon="loading"]')).toBeInTheDocument();
      // 펼쳐졌지만 자식이 없다 — 그 자리에 별도 안내 행("불러오는 중…" 등)을 만들지 않는다.
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('빈 목록이면 안내 문구로 대체된다', () => {
      render(<FileTree items={[]} />);

      expect(screen.getByText('파일이 없습니다')).toBeInTheDocument();
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    });

    it('빈 목록이어도 data-component/data-chrome은 그대로 노출된다', () => {
      const { container } = render(<FileTree items={[]} chrome="none" />);

      const root = container.querySelector('[data-component="FileTree"]');
      expect(root).toBeInTheDocument();
      expect(root).toHaveAttribute('data-chrome', 'none');
    });

    it('emptyLabel을 커스터마이즈할 수 있다', () => {
      render(<FileTree items={[]} emptyLabel="비어 있음" />);

      expect(screen.getByText('비어 있음')).toBeInTheDocument();
    });

    it('chrome을 data-chrome으로 노출한다', () => {
      const { container } = render(<FileTree items={ITEMS} chrome="none" />);

      expect(container.querySelector('[data-chrome="none"]')).toBeInTheDocument();
    });
  });

  describe('Keyboard interactions', () => {
    it('처음엔 첫 행만 tabIndex=0이다(roving tabindex)', () => {
      render(<FileTree items={TWO_ITEMS} />);

      const rows = screen.getAllByRole('treeitem');
      expect(rows[0]).toHaveAttribute('tabindex', '0');
      expect(rows[1]).toHaveAttribute('tabindex', '-1');
    });

    it('ArrowDown/ArrowUp으로 포커스가 다음/이전 행으로 옮겨간다', () => {
      render(<FileTree items={TWO_ITEMS} />);

      const [first, second] = screen.getAllByRole('treeitem');
      act(() => first!.focus());
      fireEvent.keyDown(first!, { key: 'ArrowDown' });
      expect(second).toHaveFocus();

      fireEvent.keyDown(second!, { key: 'ArrowUp' });
      expect(first).toHaveFocus();
    });

    it('수식키 없는 방향키는 선택을 바꾸지 않는다', () => {
      render(<FileTree items={THREE_ITEMS} />);

      fireEvent.click(screen.getByText('a.ts'));
      expect(isSelected('a.ts')).toBe(true);

      fireEvent.keyDown(screen.getByRole('treeitem', { name: 'a.ts' }), { key: 'ArrowDown' });

      expect(isSelected('a.ts')).toBe(true);
      expect(isSelected('b.ts')).toBe(false);
    });

    it('Home/End로 첫/마지막 행으로 옮겨간다', () => {
      render(<FileTree items={THREE_ITEMS} />);

      const [first, , last] = screen.getAllByRole('treeitem');
      act(() => first!.focus());

      fireEvent.keyDown(first!, { key: 'End' });
      expect(last).toHaveFocus();

      fireEvent.keyDown(last!, { key: 'Home' });
      expect(first).toHaveFocus();
    });

    it('ArrowRight는 접힌 폴더를 펼치고, 펼쳐진 폴더에서는 첫 자식으로 옮겨간다', () => {
      const onToggleFolder = vi.fn();
      const { rerender } = render(<FileTree items={ITEMS} onToggleFolder={onToggleFolder} />);

      const srcRow = screen.getByRole('treeitem', { name: 'src' });
      act(() => srcRow.focus());
      fireEvent.keyDown(srcRow, { key: 'ArrowRight' });
      expect(onToggleFolder).toHaveBeenCalledWith(expect.objectContaining({ id: 'src' }), true);

      rerender(<FileTree items={ITEMS} expandedIds={['src']} onToggleFolder={onToggleFolder} />);
      fireEvent.keyDown(screen.getByRole('treeitem', { name: 'src' }), { key: 'ArrowRight' });
      expect(screen.getByRole('treeitem', { name: 'main.ts' })).toHaveFocus();
    });

    it('ArrowLeft는 펼쳐진 폴더를 접고, 접힌 자식에서는 부모로 옮겨간다', () => {
      const onToggleFolder = vi.fn();
      render(<FileTree items={ITEMS} expandedIds={['src']} onToggleFolder={onToggleFolder} />);

      const mainRow = screen.getByRole('treeitem', { name: 'main.ts' });
      act(() => mainRow.focus());
      fireEvent.keyDown(mainRow, { key: 'ArrowLeft' });
      expect(screen.getByRole('treeitem', { name: 'src' })).toHaveFocus();
    });

    it('Shift+ArrowDown이 포커스를 옮기며 선택을 넓힌다', () => {
      render(<FileTree items={THREE_ITEMS} />);

      fireEvent.click(screen.getByText('a.ts'));
      fireEvent.keyDown(screen.getByRole('treeitem', { name: 'a.ts' }), { key: 'ArrowDown', shiftKey: true });

      expect(isSelected('a.ts')).toBe(true);
      expect(isSelected('b.ts')).toBe(true);
      expect(isSelected('c.ts')).toBe(false);
    });

    it('Shift+ArrowUp이 다시 좁힌다', () => {
      render(<FileTree items={THREE_ITEMS} />);

      fireEvent.click(screen.getByText('a.ts'));
      fireEvent.keyDown(screen.getByRole('treeitem', { name: 'a.ts' }), { key: 'ArrowDown', shiftKey: true });
      fireEvent.keyDown(screen.getByRole('treeitem', { name: 'b.ts' }), { key: 'ArrowUp', shiftKey: true });

      expect(isSelected('a.ts')).toBe(true);
      expect(isSelected('b.ts')).toBe(false);
      expect(isSelected('c.ts')).toBe(false);
    });

    it('Ctrl/Cmd+A가 보이는 행 전부를 선택한다(접힌 폴더의 자식·disabled 제외)', () => {
      const items = [
        { id: 'src', name: 'src', type: 'folder' as const, children: [{ id: 'hidden', name: 'hidden.ts', type: 'file' as const }] },
        { id: 'a', name: 'a.ts', type: 'file' as const },
        { id: 'b', name: 'b.ts', type: 'file' as const, disabled: true },
      ];
      render(<FileTree items={items} />);

      fireEvent.keyDown(screen.getByRole('treeitem', { name: 'src' }), { key: 'a', ctrlKey: true });

      expect(isSelected('src')).toBe(true);
      expect(isSelected('a.ts')).toBe(true);
      expect(screen.queryByRole('treeitem', { name: 'hidden.ts' })).not.toBeInTheDocument();
      expect(screen.getByRole('treeitem', { name: 'b.ts' })).not.toHaveAttribute('aria-selected');
    });

    it('Ctrl/Cmd+A가 조상 행으로 버블링되지 않는다', () => {
      const onSelectedIdsChange = vi.fn();
      render(<FileTree items={ITEMS} expandedIds={['src']} onSelectedIdsChange={onSelectedIdsChange} />);

      fireEvent.keyDown(screen.getByRole('treeitem', { name: 'main.ts' }), { key: 'a', ctrlKey: true });

      expect(onSelectedIdsChange).toHaveBeenCalledTimes(1);
    });

    it('Enter는 onActivate를 부르고 선택을 그 행 하나로 바꾼다', () => {
      const onActivate = vi.fn();
      render(<FileTree items={TWO_ITEMS} onActivate={onActivate} />);

      const first = screen.getAllByRole('treeitem')[0]!;
      act(() => first.focus());
      fireEvent.keyDown(first, { key: 'Enter' });

      expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
      expect(isSelected('a.ts')).toBe(true);
    });

    it('Space도 Enter와 같은 동작(활성화)을 한다', () => {
      const onActivate = vi.fn();
      render(<FileTree items={TWO_ITEMS} onActivate={onActivate} />);

      const first = screen.getAllByRole('treeitem')[0]!;
      act(() => first.focus());
      fireEvent.keyDown(first, { key: ' ' });

      expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    });

    it('포커스 대상이 접혀서 사라지면 첫 행으로 되돌아간다(자가치유)', () => {
      const { rerender } = render(<FileTree items={ITEMS} expandedIds={['src']} />);

      // 마우스/탭으로 진입했을 때의 focusedId 동기화(onFocus)를 재현한다 — act로 감싸야
      // 실제 focus 이벤트가 동기적으로 반영된다.
      const mainRow = screen.getByRole('treeitem', { name: 'main.ts' });
      act(() => mainRow.focus());
      expect(mainRow).toHaveAttribute('tabindex', '0');

      rerender(<FileTree items={ITEMS} expandedIds={[]} />);

      expect(screen.getByRole('treeitem', { name: 'src' })).toHaveAttribute('tabindex', '0');
    });

    it('자식 행에 포커스가 가도 부모 행으로 버블링되어 포커스가 되돌아가지 않는다', () => {
      // React의 onFocus는 native focus와 달리 조상까지 버블링된다 — 폴더 행 <li> 안에 자식
      // 행이 DOM으로 중첩되므로, 이 가드가 없으면 자식에 포커스를 줘도 곧이어 부모의 onFocus가
      // 다시 불려 focusedId가 부모로 덮인다(직접 재현해서 확인한 회귀).
      render(<FileTree items={ITEMS} expandedIds={['src']} />);

      const mainRow = screen.getByRole('treeitem', { name: 'main.ts' });
      act(() => mainRow.focus());

      expect(mainRow).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('treeitem', { name: 'src' })).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('State', () => {
    it('펼침 상태(expandedIds)에 따라 자식이 나타나고 사라진다', () => {
      const { rerender } = render(<FileTree items={ITEMS} />);

      expect(screen.queryByText('main.ts')).not.toBeInTheDocument();

      rerender(<FileTree items={ITEMS} expandedIds={['src']} />);

      expect(screen.getByText('main.ts')).toBeInTheDocument();
    });

    it('expandedIds/selectedIds를 안 넘기면(uncontrolled) 클릭만으로 펼침·선택이 동작한다', () => {
      render(<FileTree items={ITEMS} />);

      expect(screen.queryByText('main.ts')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('src'));

      expect(screen.getByText('main.ts')).toBeInTheDocument();
      expect(isSelected('src')).toBe(true);
    });

    it('defaultExpandedIds/defaultSelectedIds가 uncontrolled 시작값이 된다', () => {
      render(<FileTree items={ITEMS} defaultExpandedIds={['src']} defaultSelectedIds={['main']} />);

      expect(screen.getByText('main.ts')).toBeInTheDocument();
      expect(isSelected('main.ts')).toBe(true);
    });

    it('expandedIds를 넘기면(controlled) 클릭해도 onToggleFolder 없이는 안 바뀐다', () => {
      render(<FileTree items={ITEMS} expandedIds={['src']} />);

      fireEvent.click(screen.getByText('src'));

      // controlled라 내부 상태를 안 갖는다 — onToggleFolder가 없으면 그대로다.
      expect(screen.getByText('main.ts')).toBeInTheDocument();
      expect(screen.getByRole('treeitem', { name: 'src' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('selectedIds를 넘기면(controlled) 클릭해도 onSelectedIdsChange 없이는 안 바뀐다', () => {
      render(<FileTree items={TWO_ITEMS} selectedIds={['a']} />);

      fireEvent.click(screen.getByText('b.ts'), { ctrlKey: true });

      expect(isSelected('a.ts')).toBe(true);
      expect(isSelected('b.ts')).toBe(false);
    });

    it('활성화를 onActivate 로 알린다', () => {
      const onActivate = vi.fn();
      render(<FileTree items={ITEMS} onActivate={onActivate} />);

      fireEvent.click(screen.getByText('src'));

      expect(onActivate).toHaveBeenCalled();
    });

    it('클릭 한 번으로 폴더가 펼쳐지면서 선택도 같이 알린다', () => {
      const onActivate = vi.fn();
      const onSelectedIdsChange = vi.fn();
      const onToggleFolder = vi.fn();
      render(<FileTree items={ITEMS} onActivate={onActivate} onSelectedIdsChange={onSelectedIdsChange} onToggleFolder={onToggleFolder} />);

      fireEvent.click(screen.getByText('src'));

      expect(onToggleFolder).toHaveBeenCalledWith(expect.objectContaining({ id: 'src' }), true);
      expect(onSelectedIdsChange).toHaveBeenCalledWith(['src']);
      expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'src' }));
    });

    it('item.onClick을 클릭 시 호출한다', () => {
      const onClick = vi.fn();
      render(<FileTree items={[{ id: 'a', name: 'a.ts', type: 'file', onClick }]} />);

      fireEvent.click(screen.getByText('a.ts'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('disabled 행은 클릭해도 선택·토글을 알리지 않는다', () => {
      const onActivate = vi.fn();
      const onSelectedIdsChange = vi.fn();
      const onToggleFolder = vi.fn();
      render(
        <FileTree
          items={[{ id: 'locked', name: 'locked', type: 'folder', disabled: true, children: [] }]}
          onActivate={onActivate}
          onSelectedIdsChange={onSelectedIdsChange}
          onToggleFolder={onToggleFolder}
        />,
      );

      fireEvent.click(screen.getByText('locked'));

      expect(onActivate).not.toHaveBeenCalled();
      expect(onSelectedIdsChange).not.toHaveBeenCalled();
      expect(onToggleFolder).not.toHaveBeenCalled();
    });

    it('Ctrl/Cmd+클릭이 선택을 토글한다', () => {
      render(<FileTree items={THREE_ITEMS} />);

      fireEvent.click(screen.getByText('a.ts'));
      fireEvent.click(screen.getByText('c.ts'), { ctrlKey: true });

      expect(isSelected('a.ts')).toBe(true);
      expect(isSelected('c.ts')).toBe(true);
      expect(isSelected('b.ts')).toBe(false);

      // 다시 Ctrl+클릭하면 제거된다.
      fireEvent.click(screen.getByText('c.ts'), { ctrlKey: true });
      expect(isSelected('c.ts')).toBe(false);
      expect(isSelected('a.ts')).toBe(true);
    });

    it('Ctrl+클릭은 onActivate를 부르지 않는다', () => {
      const onActivate = vi.fn();
      render(<FileTree items={THREE_ITEMS} onActivate={onActivate} />);

      fireEvent.click(screen.getByText('a.ts'), { ctrlKey: true });

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('Ctrl+클릭은 폴더를 펼치지 않는다', () => {
      const onToggleFolder = vi.fn();
      render(<FileTree items={ITEMS} onToggleFolder={onToggleFolder} />);

      fireEvent.click(screen.getByText('src'), { ctrlKey: true });

      expect(onToggleFolder).not.toHaveBeenCalled();
      expect(screen.queryByText('main.ts')).not.toBeInTheDocument();
    });

    it('Shift+클릭이 앵커부터 범위를 선택한다', () => {
      render(<FileTree items={THREE_ITEMS} />);

      fireEvent.click(screen.getByText('a.ts'));
      fireEvent.click(screen.getByText('c.ts'), { shiftKey: true });

      expect(isSelected('a.ts')).toBe(true);
      expect(isSelected('b.ts')).toBe(true);
      expect(isSelected('c.ts')).toBe(true);
    });

    it('Shift+클릭 범위가 펼쳐진 자식을 포함해 flat 순서로 잡힌다', () => {
      const items = [
        { id: 'src', name: 'src', type: 'folder' as const, children: [{ id: 'inner', name: 'inner.ts', type: 'file' as const }] },
        { id: 'zebra', name: 'zebra.ts', type: 'file' as const },
      ];
      render(<FileTree items={items} defaultExpandedIds={['src']} />);

      fireEvent.click(screen.getByText('inner.ts'));
      fireEvent.click(screen.getByText('zebra.ts'), { shiftKey: true });

      expect(isSelected('inner.ts')).toBe(true);
      expect(isSelected('zebra.ts')).toBe(true);
      // 'src'는 flat 순서상 anchor(inner) 앞이라 범위 밖이다.
      expect(isSelected('src')).toBe(false);
    });

    it('앵커가 없는 첫 조작에서는 대상 자신이 앵커가 되어 그 행 하나만 선택된다', () => {
      render(<FileTree items={THREE_ITEMS} />);

      fireEvent.click(screen.getByText('c.ts'), { shiftKey: true });

      expect(isSelected('c.ts')).toBe(true);
      expect(isSelected('a.ts')).toBe(false);
      expect(isSelected('b.ts')).toBe(false);
    });

    it('Shift+클릭 범위에서 disabled 행이 빠진다', () => {
      const items = [
        { id: 'a', name: 'a.ts', type: 'file' as const },
        { id: 'b', name: 'b.ts', type: 'file' as const, disabled: true },
        { id: 'c', name: 'c.ts', type: 'file' as const },
      ];
      render(<FileTree items={items} />);

      fireEvent.click(screen.getByText('a.ts'));
      fireEvent.click(screen.getByText('c.ts'), { shiftKey: true });

      expect(isSelected('a.ts')).toBe(true);
      expect(isSelected('c.ts')).toBe(true);
      expect(screen.getByRole('treeitem', { name: 'b.ts' })).not.toHaveAttribute('aria-selected');
    });

    it('어느 행을 우클릭했는지 알리고 이벤트는 삼키지 않는다', () => {
      const onContextMenu = vi.fn();
      render(<FileTree items={ITEMS} onContextMenu={onContextMenu} />);

      fireEvent.contextMenu(screen.getByText('src'));

      expect(onContextMenu).toHaveBeenCalledWith(expect.objectContaining({ id: 'src' }), expect.anything());
    });

    it('disabled 행은 우클릭도 무시한다', () => {
      const onContextMenu = vi.fn();
      render(
        <FileTree
          items={[{ id: 'locked', name: 'locked.md', type: 'file', disabled: true }]}
          onContextMenu={onContextMenu}
        />,
      );

      fireEvent.contextMenu(screen.getByText('locked.md'));

      expect(onContextMenu).not.toHaveBeenCalled();
    });

    /**
     * `onContextMenu`를 안 부르는 것만으론 부족하다 — 실제 소비처(`apps/workbench`)는 이 컴포넌트를
     * `ContextMenu.Trigger`(Radix, `onContextMenu`를 모르는 채로 그저 감싸는 조상)로 감싸는데, 이
     * 이벤트가 거기까지 버블링돼 버리면 "우클릭 대상 없음" 상태로 메뉴가 열려 버린다(그 메뉴에서
     * "새 파일"을 고르면 대상이 없으니 워크스페이스 루트에 파일이 생기는 사고로 이어졌다 — 실제로
     * 겪은 회귀). 그래서 disabled 행에서는 조상까지 아예 못 나가게 막아야 한다.
     */
    it('disabled 행의 우클릭은 조상 요소로 버블링되지 않는다', () => {
      const onAncestorContextMenu = vi.fn();
      render(
        <div onContextMenu={onAncestorContextMenu}>
          <FileTree items={[{ id: 'locked', name: 'locked.md', type: 'file', disabled: true }]} />
        </div>,
      );

      fireEvent.contextMenu(screen.getByText('locked.md'));

      expect(onAncestorContextMenu).not.toHaveBeenCalled();
    });

    it('선택 밖 행을 우클릭하면 선택이 그 행 하나로 바뀐다', () => {
      render(<FileTree items={THREE_ITEMS} />);

      fireEvent.click(screen.getByText('a.ts'));
      expect(isSelected('a.ts')).toBe(true);

      fireEvent.contextMenu(screen.getByText('c.ts'));

      expect(isSelected('c.ts')).toBe(true);
      expect(isSelected('a.ts')).toBe(false);
    });

    it('선택 안에 있는 행을 우클릭하면 선택이 그대로 유지된다', () => {
      render(<FileTree items={THREE_ITEMS} />);

      fireEvent.click(screen.getByText('a.ts'));
      fireEvent.click(screen.getByText('c.ts'), { ctrlKey: true });
      expect(isSelected('a.ts')).toBe(true);
      expect(isSelected('c.ts')).toBe(true);

      fireEvent.contextMenu(screen.getByText('a.ts'));

      expect(isSelected('a.ts')).toBe(true);
      expect(isSelected('c.ts')).toBe(true);
    });
  });

  describe('인라인 편집', () => {
    it('editingId와 일치하는 행은 라벨 대신 입력을 보여주고, 마운트되면 그 값으로 채워 전체 선택한다', () => {
      render(<FileTree items={ITEMS} editingId="src" />);

      const input = screen.getByDisplayValue('src') as HTMLInputElement;
      expect(input).toHaveFocus();
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('src'.length);
    });

    it('Enter를 누르면 고친 값으로 onEditCommit이 불린다', () => {
      const onEditCommit = vi.fn();
      render(<FileTree items={ITEMS} editingId="src" onEditCommit={onEditCommit} />);

      const input = screen.getByDisplayValue('src');
      fireEvent.change(input, { target: { value: 'source' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onEditCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'src' }), 'source');
    });

    it('Escape를 누르면 값과 무관하게 onEditCancel이 불린다', () => {
      const onEditCommit = vi.fn();
      const onEditCancel = vi.fn();
      render(<FileTree items={ITEMS} editingId="src" onEditCommit={onEditCommit} onEditCancel={onEditCancel} />);

      fireEvent.change(screen.getByDisplayValue('src'), { target: { value: '중간에 고치다 만 값' } });
      fireEvent.keyDown(screen.getByDisplayValue('중간에 고치다 만 값'), { key: 'Escape' });

      expect(onEditCancel).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'src' }));
      expect(onEditCommit).not.toHaveBeenCalled();
    });

    it('포커스를 잃으면(다른 곳 클릭 등) 그 값으로 커밋한다', () => {
      const onEditCommit = vi.fn();
      render(<FileTree items={ITEMS} editingId="src" onEditCommit={onEditCommit} />);

      fireEvent.change(screen.getByDisplayValue('src'), { target: { value: 'renamed' } });
      fireEvent.blur(screen.getByDisplayValue('renamed'));

      expect(onEditCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'src' }), 'renamed');
    });

    it('편집 중이 아닌 행은 평소대로 라벨을 보여준다', () => {
      render(<FileTree items={TWO_ITEMS} editingId="a" />);

      expect(screen.getByDisplayValue('a.ts')).toBeInTheDocument();
      expect(screen.getByText('b.ts')).toBeInTheDocument();
    });
  });

  describe('더블클릭', () => {
    it('행을 더블클릭하면 onRowDoubleClick이 그 항목으로 불린다', () => {
      const onRowDoubleClick = vi.fn();
      render(<FileTree items={TWO_ITEMS} onRowDoubleClick={onRowDoubleClick} />);

      fireEvent.doubleClick(screen.getByText('a.ts'));

      expect(onRowDoubleClick).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'a' }));
    });

    it('disabled 행은 더블클릭해도 아무 일도 없다', () => {
      const onRowDoubleClick = vi.fn();
      render(<FileTree items={[{ id: 'a', name: 'a.ts', type: 'file', disabled: true }]} onRowDoubleClick={onRowDoubleClick} />);

      fireEvent.doubleClick(screen.getByText('a.ts'));

      expect(onRowDoubleClick).not.toHaveBeenCalled();
    });
  });

  describe('Compact Folders — 폴더 하나만 자식으로 둔 체인을 한 행으로 합친다', () => {
    const CHAIN_ITEMS = [
      {
        id: 'a',
        name: 'a',
        type: 'folder' as const,
        children: [
          {
            id: 'b',
            name: 'b',
            type: 'folder' as const,
            children: [{ id: 'b/f', name: 'f.ts', type: 'file' as const }],
          },
        ],
      },
    ];

    it('a/b 한 행만 보이고 a·b 각각의 행은 없다', () => {
      render(<FileTree items={CHAIN_ITEMS} />);

      expect(screen.getByRole('treeitem', { name: 'a/b' })).toBeInTheDocument();
      expect(screen.queryByRole('treeitem', { name: 'a' })).not.toBeInTheDocument();
      expect(screen.queryByRole('treeitem', { name: 'b' })).not.toBeInTheDocument();
    });

    it('합쳐진 행의 id는 체인의 마지막(terminal) 폴더다 — expandedIds/selectedIds가 그 id로 동작해야 한다', () => {
      render(<FileTree items={CHAIN_ITEMS} expandedIds={['b']} selectedIds={['b']} />);

      const row = screen.getByRole('treeitem', { name: 'a/b' });
      expect(row).toHaveAttribute('aria-expanded', 'true');
      expect(row).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('f.ts')).toBeInTheDocument();
    });

    it('클릭하면 활성화 콜백에 terminal 항목이 온다', () => {
      const onActivate = vi.fn();
      render(<FileTree items={CHAIN_ITEMS} onActivate={onActivate} />);

      fireEvent.click(screen.getByText('a/b'));

      expect(onActivate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'b', name: 'a/b' }));
    });
  });
});
