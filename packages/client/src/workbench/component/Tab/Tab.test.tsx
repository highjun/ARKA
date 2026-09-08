import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '#utils/axe';
import { implementsClassName, implementsDataComponent, implementsForwardRef } from '#utils/testing';
import { Tab } from './Tab';
import type { TabGroupItem, TabTreeLeaf, TabTreeSplit } from './Tab';

const ITEMS: TabGroupItem[] = [
  { id: 'a', title: 'A', iconId: 'file', content: 'A content' },
  { id: 'b', title: 'B', iconId: 'file', content: 'B content' },
];

const noop = () => {};

/** `tree`가 없으면 Group(단일 탭 묶음), 있으면 Split(분할 트리)로 렌더된다 — 두 경로 모두 같은 계약을 지킨다. */
describe('Tab', () => {
  it('tree 를 생략하면 Group 으로 렌더링한다', () => {
    render(<Tab activeTab="a" tabItems={ITEMS} onTabClick={noop} onMenuClick={noop} />);

    expect(screen.getByRole('tab', { name: /A/ })).toBeInTheDocument();
    expect(screen.getByText('A content')).toBeInTheDocument();
  });

  /**
   * `stripEmptyLabel`은 빈 슬롯의 문구만 바꿀 뿐 Strip 자체(테두리·배경·"..." 메뉴)를 못
   * 숨긴다 — 탭이 0개면 Strip을 아예 렌더하지 않아야 그 잔재가 안 남는다(2026-08-31).
   */
  it('탭이 0개면 Strip을 렌더하지 않는다', () => {
    render(<Tab activeTab="" tabItems={[]} onTabClick={noop} onMenuClick={noop} emptyMessage="탐색기에서 파일을 고르세요." />);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('탐색기에서 파일을 고르세요.')).toBeInTheDocument();
  });

  it('tree 를 주면 Split 으로 렌더링한다', () => {
    const tree: TabTreeLeaf = { kind: 'leaf', id: 'only', activeTab: 'a', tabItems: ITEMS };

    render(<Tab tree={tree} onTabClick={noop} onMenuClick={noop} />);

    expect(screen.getByRole('tab', { name: /A/ })).toBeInTheDocument();
  });

  implementsDataComponent((extra) => <Tab activeTab="a" tabItems={ITEMS} onTabClick={noop} onMenuClick={noop} {...extra} />, 'Tab');

  it('data-component 로 컴포넌트 이름을 노출한다(Split)', () => {
    const tree: TabTreeLeaf = { kind: 'leaf', id: 'only', activeTab: 'a', tabItems: ITEMS };
    const { container } = render(<Tab tree={tree} onTabClick={noop} onMenuClick={noop} />);

    expect(container.querySelector('[data-component="Tab"]')).toBeInTheDocument();
  });

  implementsClassName((extra) => <Tab activeTab="a" tabItems={ITEMS} onTabClick={noop} onMenuClick={noop} {...extra} />);
  implementsForwardRef((extra) => <Tab activeTab="a" tabItems={ITEMS} onTabClick={noop} onMenuClick={noop} {...extra} />, HTMLElement);

  it('forwardRef 로 루트 DOM 노드에 접근할 수 있다(Split, 분기 트리)', () => {
    const ref = createRef<HTMLElement>();
    const tree: TabTreeSplit = {
      kind: 'split',
      id: 'root',
      orientation: 'horizontal',
      children: [
        { kind: 'leaf', id: 'left', activeTab: 'a', tabItems: ITEMS },
        { kind: 'leaf', id: 'right', activeTab: 'b', tabItems: ITEMS },
      ],
    };

    render(<Tab ref={ref} tree={tree} onTabClick={noop} onMenuClick={noop} />);

    expect(ref.current).toBe(document.querySelector('[data-component="Tab"]'));
    expect(ref.current).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('Tab.Group 을 직접 써도 같은 계약을 지킨다', () => {
    const ref = createRef<HTMLElement>();

    render(<Tab.Group ref={ref} activeTab="a" tabItems={ITEMS} onTabClick={noop} onMenuClick={noop} />);

    expect(ref.current).toHaveAttribute('data-component', 'Tab');
  });

  it('닫기 버튼 클릭 시 onTabClose 가 그 탭 id 로 호출된다', () => {
    const onTabClose = vi.fn();
    render(<Tab activeTab="a" tabItems={ITEMS} onTabClick={noop} onMenuClick={noop} onTabClose={onTabClose} />);

    screen.getByRole('button', { name: 'A 닫기' }).click();

    expect(onTabClose).toHaveBeenCalledWith('a');
  });

  /**
   * 비활성 탭은 `headerActionSlot`(활성 탭의 닫기 자리)을 아예 마운트하지 않는다(폭 축소가
   * 목적, 2026-09-01 지적으로 확인) — 대신 `headerCloseButtonHover`가 `.header` 위에 겹쳐
   * 뜬다. 호버 없이도 항상 보이고 항상 눌린다(2026-09, hover 크로스페이드 제거).
   */
  it('비활성 탭도 겹쳐 뜨는 닫기 버튼으로 닫을 수 있다', () => {
    const onTabClose = vi.fn();
    render(<Tab activeTab="a" tabItems={ITEMS} onTabClick={noop} onMenuClick={noop} onTabClose={onTabClose} />);

    screen.getByRole('button', { name: 'B 닫기' }).click();

    expect(onTabClose).toHaveBeenCalledWith('b');
  });

  /**
   * 예전엔 활성+dirty 탭의 닫기 버튼이 hover 전용이라 dirty-dot 뒤에 숨어 있었다 — 그
   * 크로스페이드를 없앴으므로(2026-09) dirty 여부와 무관하게 곧바로 클릭 가능해야 하고,
   * dirty-dot 자체도 더 이상 렌더되지 않아야 한다.
   */
  it('활성 탭이 dirty여도 닫기 버튼이 곧바로 클릭 가능하고, dirty-dot은 렌더되지 않는다', () => {
    const onTabClose = vi.fn();
    const items: TabGroupItem[] = [{ ...ITEMS[0]!, isDirty: true }, ITEMS[1]!];
    render(<Tab activeTab="a" tabItems={items} onTabClick={noop} onMenuClick={noop} onTabClose={onTabClose} />);

    screen.getByRole('button', { name: 'A 닫기' }).click();

    expect(onTabClose).toHaveBeenCalledWith('a');
    expect(screen.queryByLabelText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('미리보기 탭을 더블클릭하면 onTabPin이 그 id로 호출된다', () => {
    const onTabPin = vi.fn();
    const items: TabGroupItem[] = [{ ...ITEMS[0]!, isPreview: true }, ITEMS[1]!];
    render(<Tab activeTab="a" tabItems={items} onTabClick={noop} onMenuClick={noop} onTabPin={onTabPin} />);

    fireEvent.doubleClick(screen.getByRole('tab', { name: /A/ }));

    expect(onTabPin).toHaveBeenCalledWith('a');
  });

  it('고정된(미리보기 아닌) 탭을 더블클릭해도 onTabPin이 안 불린다', () => {
    const onTabPin = vi.fn();
    render(<Tab activeTab="a" tabItems={ITEMS} onTabClick={noop} onMenuClick={noop} onTabPin={onTabPin} />);

    fireEvent.doubleClick(screen.getByRole('tab', { name: /A/ }));

    expect(onTabPin).not.toHaveBeenCalled();
  });

  describe('State', () => {
    it('defaultActiveTab이 uncontrolled 시작값이 된다', () => {
      render(<Tab tabItems={ITEMS} defaultActiveTab="b" onTabClick={noop} onMenuClick={noop} />);

      expect(screen.getByRole('tab', { name: /B/ })).toHaveAttribute('aria-selected', 'true');
    });

    it('uncontrolled 모드에서 클릭한 탭이 활성 상태가 된다', () => {
      render(<Tab tabItems={ITEMS} defaultActiveTab="a" onTabClick={noop} onMenuClick={noop} />);

      fireEvent.click(screen.getByRole('tab', { name: /B/ }));

      expect(screen.getByRole('tab', { name: /B/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('B content')).toBeInTheDocument();
    });

    it('activeTab을 넘기면(controlled) 클릭해도 onActiveTabChange 없이는 강조가 안 바뀐다', () => {
      render(<Tab tabItems={ITEMS} activeTab="a" onTabClick={noop} onMenuClick={noop} />);

      fireEvent.click(screen.getByRole('tab', { name: /B/ }));

      expect(screen.getByRole('tab', { name: /A/ })).toHaveAttribute('aria-selected', 'true');
    });

    it('탭을 클릭하면 controlled 여부와 무관하게 onTabClick이 그 id로 불린다', () => {
      const onTabClick = vi.fn();
      render(<Tab tabItems={ITEMS} activeTab="a" onTabClick={onTabClick} onMenuClick={noop} />);

      fireEvent.click(screen.getByRole('tab', { name: /B/ }));

      expect(onTabClick).toHaveBeenCalledWith('b');
    });
  });

  it('axe 접근성 위반이 없다', async () => {
    const { container } = render(<Tab activeTab="a" tabItems={ITEMS} onTabClick={noop} onMenuClick={noop} />);

    // nested-interactive: 탭 헤더(role="tab")가 "..." 메뉴 버튼(진짜 <button>)을 자식으로 품는다 —
    // VSCode 등 실제 IDE도 쓰는 알려진 패턴이다. role=tab 을 제목/아이콘에만 걸고 메뉴 버튼을
    // 형제로 분리하면 근본적으로 고칠 수 있지만, 그러면 드래그 히트박스(getStripChildRects)와
    // 포인터 핸들러의 closest('button') 예외 처리를 실제로 바꿔야 해서 legacy 1:1 포트 동작이
    // 달라질 위험이 있다 — 지금은 구조를 그대로 두고 이 규칙만 알려진 한계로 제외한다.
    //
    // `implementsNoA11yViolations`는 이 예외 옵션을 받지 못해 여기선 못 쓴다(ui/test-implements-helpers,
    // 의도된 예외 — draft 상태라 warn에 머문다).
    await expectNoA11yViolations(container, { rules: { 'nested-interactive': { enabled: false } } });
  });
});
