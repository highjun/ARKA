import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { CommandPalette } from './CommandPalette';

const ITEMS = [
  { id: 'a', label: '새 파일' },
  { id: 'b', label: '새 폴더' },
  { id: 'c', label: '테마 전환' },
];

describe('CommandPalette', () => {
  it('열려 있으면(제어) 입력창과 항목이 보인다', () => {
    render(<CommandPalette open onOpenChange={() => {}} items={ITEMS} onSelect={() => {}} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('새 파일')).toBeInTheDocument();
    expect(screen.getByText('테마 전환')).toBeInTheDocument();
  });

  it('닫혀 있으면(제어) 아무것도 안 보인다', () => {
    render(<CommandPalette open={false} onOpenChange={() => {}} items={ITEMS} onSelect={() => {}} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('defaultOpen 이면 open 없이도 열려 있다(비제어)', () => {
    render(<CommandPalette defaultOpen items={ITEMS} onSelect={() => {}} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('open/defaultOpen 둘 다 없으면 기본은 닫혀 있다', () => {
    render(<CommandPalette items={ITEMS} onSelect={() => {}} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('항목을 고르면 그 id로 onSelect가 불린다', () => {
    const onSelect = vi.fn();
    render(<CommandPalette open onOpenChange={() => {}} items={ITEMS} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('새 폴더'));

    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('검색어와 맞는 게 없으면 emptyMessage를 보여준다', () => {
    render(<CommandPalette open onOpenChange={() => {}} items={ITEMS} onSelect={() => {}} emptyMessage="결과가 없다" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '존재하지않는검색어' } });

    expect(screen.getByText('결과가 없다')).toBeInTheDocument();
  });

  it('shortcut 이 있으면 키마다 kbd 로 보인다', () => {
    const items = [{ id: 'a', label: '새 파일', shortcut: ['Ctrl', 'N'] }];
    render(<CommandPalette open onOpenChange={() => {}} items={items} onSelect={() => {}} />);

    expect(screen.getByText('Ctrl').closest('kbd')).toBeInTheDocument();
    expect(screen.getByText('N').closest('kbd')).toBeInTheDocument();
  });

  it('shortcut 이 없으면 kbd 가 없다', () => {
    render(<CommandPalette open onOpenChange={() => {}} items={ITEMS} onSelect={() => {}} />);

    expect(document.querySelector('kbd')).not.toBeInTheDocument();
  });

  implementsDataComponent(
    (extra) => <CommandPalette open onOpenChange={() => {}} items={ITEMS} onSelect={() => {}} {...extra} />,
    'CommandPalette',
  );

  // `implementsClassName`은 못 쓴다 — `className`은 `[cmdk-dialog]`에 실리는데,
  // `data-testid`(ref와 동일)는 `[cmdk-root]`에 실려 서로 다른 노드다(ui/test-implements-helpers,
  // 의도된 예외 — draft 상태라 warn에 머문다).
  it('넘긴 className 을 그대로 싣는다', () => {
    render(<CommandPalette open onOpenChange={() => {}} items={ITEMS} onSelect={() => {}} className="extra" />);

    expect(document.querySelector('[cmdk-dialog]')?.className).toContain('extra');
  });

  implementsForwardRef(
    (extra) => <CommandPalette open onOpenChange={() => {}} items={ITEMS} onSelect={() => {}} {...extra} />,
    HTMLDivElement,
  );

  implementsNoA11yViolations(() => <CommandPalette open onOpenChange={() => {}} items={ITEMS} onSelect={() => {}} />);
});
