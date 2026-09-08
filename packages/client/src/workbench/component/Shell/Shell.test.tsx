import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '#utils/axe';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Shell } from './Shell';
import { ContextMenu } from '#components/shell/ContextMenu';

const ACTIVITY_ITEMS = [{ id: 'a', iconId: 'files' as const, label: '탐색기', isActive: true }];

describe('Shell', () => {
  it('brand/actions/children 을 렌더한다', () => {
    render(
      <Shell colorMode="light" brand="왼쪽" actions="오른쪽">
        본문
      </Shell>,
    );

    expect(screen.getByText('왼쪽')).toBeInTheDocument();
    expect(screen.getByText('오른쪽')).toBeInTheDocument();
    expect(screen.getByText('본문')).toBeInTheDocument();
  });

  it('activityItems 를 안 주면 사이드바 자체가 없다(토글 버튼도 없다)', () => {
    render(<Shell colorMode="light">본문</Shell>);

    expect(screen.queryByRole('button', { name: '사이드바 열기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '탐색기' })).not.toBeInTheDocument();
  });

  it('activityItems 를 주면 사이드바(ActivityBar 포함)가 뜬다', () => {
    render(
      <Shell colorMode="light" activityItems={ACTIVITY_ITEMS} onActivitySelect={() => {}}>
        본문
      </Shell>,
    );

    expect(screen.getByRole('button', { name: '탐색기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '사이드바 열기' })).toBeInTheDocument();
  });

  it('panelContent 가 없으면 좁은 폭으로 렌더된다', () => {
    const { container } = render(
      <Shell colorMode="light" activityItems={ACTIVITY_ITEMS} sidebarAriaLabel="사이드바">
        본문
      </Shell>,
    );

    expect(container.querySelector('[data-component="ShellSidebar"]')).toHaveStyle({ '--pane-width-custom': '48px' } as never);
  });

  it('panelContent 가 있으면 넓은 폭으로 렌더된다', () => {
    const { container } = render(
      <Shell colorMode="light" activityItems={ACTIVITY_ITEMS} panelContent="패널 내용" sidebarAriaLabel="사이드바">
        본문
      </Shell>,
    );

    expect(screen.getByText('패널 내용')).toBeInTheDocument();
    expect(container.querySelector('[data-component="ShellSidebar"]')).toHaveStyle({ '--pane-width-custom': '304px' } as never);
  });

  it('sidebarResizable 이 없으면 고정폭이다(리사이즈 불가)', () => {
    render(
      <Shell colorMode="light" activityItems={ACTIVITY_ITEMS} panelContent="패널 내용" sidebarAriaLabel="사이드바">
        본문
      </Shell>,
    );

    expect(screen.queryByRole('slider', { name: /splitter/i })).not.toBeInTheDocument();
  });

  it('sidebarResizable 을 주면 드래그로 폭을 조절할 수 있다', () => {
    const { container } = render(
      <Shell
        colorMode="light"
        activityItems={ACTIVITY_ITEMS}
        panelContent="패널 내용"
        sidebarAriaLabel="사이드바"
        sidebarResizable
        sidebarMinWidth="200px"
      >
        본문
      </Shell>,
    );

    const sidebar = container.querySelector('[data-component="ShellSidebar"]');
    expect(sidebar).toHaveAttribute('data-resizable', 'true');
    expect(sidebar).toHaveStyle({ '--pane-min-width': '200px', '--pane-width-custom': '304px' } as never);
    expect(screen.getByRole('slider', { name: /splitter/i })).toBeInTheDocument();
  });

  it('panelTitle·panelActions 이 둘 다 없으면 패널 헤더 행 자체가 없다', () => {
    render(
      <Shell colorMode="light" activityItems={ACTIVITY_ITEMS} panelContent="패널 내용" sidebarAriaLabel="사이드바">
        본문
      </Shell>,
    );

    expect(screen.queryByText('파일 탐색기')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument();
  });

  it('panelTitle 을 주면 패널 위에 제목이 뜬다', () => {
    render(
      <Shell colorMode="light" activityItems={ACTIVITY_ITEMS} panelContent="패널 내용" panelTitle="파일 탐색기" sidebarAriaLabel="사이드바">
        본문
      </Shell>,
    );

    expect(screen.getByText('파일 탐색기')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument();
  });

  it('panelActions 를 주면 "더 보기" 버튼이 뜨고, 누르면 그 메뉴가 열린다', () => {
    render(
      <Shell
        colorMode="light"
        activityItems={ACTIVITY_ITEMS}
        panelContent="패널 내용"
        panelActions={<span>새 파일</span>}
        sidebarAriaLabel="사이드바"
      >
        본문
      </Shell>,
    );

    const trigger = screen.getByRole('button', { name: '더 보기' });
    expect(screen.queryByText('새 파일')).not.toBeInTheDocument();

    fireEvent.pointerDown(trigger, { button: 0 });

    expect(screen.getByText('새 파일')).toBeInTheDocument();
  });

  it('사이드바 열기 버튼을 누르면 열린다(비제어)', () => {
    render(
      <Shell colorMode="light" activityItems={ACTIVITY_ITEMS} sidebarAriaLabel="사이드바">
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole('button', { name: '사이드바 열기' }));

    expect(document.querySelector('[data-state="open"]')).toBeInTheDocument();
  });

  it('닫기 버튼을 누르면 onSidebarOpenChange(false) 가 호출된다', () => {
    const onSidebarOpenChange = vi.fn();
    render(
      <Shell colorMode="light" activityItems={ACTIVITY_ITEMS} sidebarOpen onSidebarOpenChange={onSidebarOpenChange}>
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole('button', { name: '사이드바 닫기' }));

    expect(onSidebarOpenChange).toHaveBeenCalledWith(false);
  });

  it('overlays 는 SplitPageLayout 밖의 형제로 렌더된다', () => {
    render(
      <Shell colorMode="light" overlays={<span data-testid="overlay">오버레이</span>}>
        본문
      </Shell>,
    );

    const overlay = screen.getByTestId('overlay');
    const layout = document.querySelector('[data-component="SplitPageLayout"]');
    expect(layout).not.toBeNull();
    expect(layout?.contains(overlay)).toBe(false);
  });

  it('overlays 로 넘긴 포탈 기반 컴포넌트가 Shell 의 portalRoot 로 실제로 포탈된다', () => {
    const { container } = render(
      <Shell
        colorMode="light"
        overlays={
          <ContextMenu open>
            <ContextMenu.Trigger>트리거</ContextMenu.Trigger>
            <ContextMenu.Content>
              <ContextMenu.Item>항목</ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu>
        }
      >
        본문
      </Shell>,
    );

    // 핵심 계약 — `usePortalContainer()`가 가리키는 곳이 실제로 Shell 이 만든 portalRoot(같은
    // `ThemeProvider`/색 토큰 스코프 안)인지. 이게 어긋나면 이번 세션에서 CommandPalette/
    // ContextMenu 가 Storybook 에서 투명하게 뜨던 것과 같은 버그(색 토큰 스코프 밖으로 포탈)가
    // 재현된다 — `SplitPageLayout`(children 자리) 밖에서, `Shell`(data-component) 서브트리
    // 안에서 메뉴가 잡혀야 한다.
    const menu = screen.getByRole('menu');
    const layout = container.querySelector('[data-component="SplitPageLayout"]');
    const shellRoot = document.querySelector('[data-component="Shell"]');
    expect(layout?.contains(menu)).toBe(false);
    expect(shellRoot?.contains(menu)).toBe(true);
  });

  implementsForwardRef(
    (extra) => (
      <Shell colorMode="light" {...extra}>
        본문
      </Shell>
    ),
    HTMLDivElement,
  );

  implementsDataComponent(
    (extra) => (
      <Shell colorMode="light" {...extra}>
        본문
      </Shell>
    ),
    'Shell',
  );

  implementsClassName((extra) => (
    <Shell colorMode="light" {...extra}>
      본문
    </Shell>
  ));

  implementsNoA11yViolations(() => (
    <Shell colorMode="light" brand="왼쪽" activityItems={ACTIVITY_ITEMS} panelContent="패널" sidebarAriaLabel="사이드바">
      본문
    </Shell>
  ));

  it('axe 접근성 위반이 없다(Portal로 빠져나간 실제 내용까지)', async () => {
    render(
      <Shell colorMode="light" brand="왼쪽" activityItems={ACTIVITY_ITEMS} panelContent="패널" sidebarAriaLabel="사이드바">
        본문
      </Shell>,
    );

    // Shell 은 사이드바 Sheet(Radix Dialog)를 내부에서 이미 portal로 띄운다 — render()가
    // 돌려주는 container 는 그 형제라 안 잡힌다. 실제로 뜬 걸 검사하려면 body 를 봐야 한다.
    await expectNoA11yViolations(document.body);
  });
});
