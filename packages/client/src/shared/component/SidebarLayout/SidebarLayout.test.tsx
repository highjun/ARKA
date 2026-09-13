import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { SidebarLayout } from './SidebarLayout';

describe('SidebarLayout', () => {
  implementsClassName((extra) => <SidebarLayout {...extra}>content</SidebarLayout>);
  implementsDataComponent((extra) => <SidebarLayout {...extra}>content</SidebarLayout>, 'SidebarLayout');
  implementsForwardRef((extra) => <SidebarLayout {...extra}>content</SidebarLayout>, HTMLDivElement);
  implementsNoA11yViolations(() => (
    <SidebarLayout title="Sessions" actions={<button type="button">더 보기</button>}>
      content
    </SidebarLayout>
  ));

  it('본문을 렌더한다', () => {
    render(<SidebarLayout>본문 내용</SidebarLayout>);

    expect(screen.getByText('본문 내용')).toBeInTheDocument();
  });

  it('title과 actions를 둘 다 넘기면 헤더에 함께 뜬다', () => {
    render(
      <SidebarLayout title="Sessions" actions={<button type="button">더 보기</button>}>
        본문
      </SidebarLayout>,
    );

    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '더 보기' })).toBeInTheDocument();
  });

  it('title만 넘기면 actions 없이 헤더가 뜬다', () => {
    render(<SidebarLayout title="Sessions">본문</SidebarLayout>);

    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('title과 actions가 둘 다 없으면 헤더 자체가 안 뜬다', () => {
    const { container } = render(<SidebarLayout>본문</SidebarLayout>);

    expect(container.querySelector('header')).not.toBeInTheDocument();
  });
});
