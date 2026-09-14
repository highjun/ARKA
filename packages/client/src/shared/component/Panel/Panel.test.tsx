import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsRef, implementsNoA11yViolations } from '#utils/testing';
import { Panel } from './Panel';

describe('Panel', () => {
  implementsClassName((extra) => <Panel {...extra}>content</Panel>);
  implementsDataComponent((extra) => <Panel {...extra}>content</Panel>, 'Panel');
  implementsRef((extra) => <Panel {...extra}>content</Panel>, HTMLDivElement);
  implementsNoA11yViolations(() => (
    <Panel title="Sessions" actions={<button type="button">더 보기</button>}>
      content
    </Panel>
  ));

  it('본문을 렌더한다', () => {
    render(<Panel>본문 내용</Panel>);

    expect(screen.getByText('본문 내용')).toBeInTheDocument();
  });

  it('title과 actions를 둘 다 넘기면 헤더에 함께 뜬다', () => {
    render(
      <Panel title="Sessions" actions={<button type="button">더 보기</button>}>
        본문
      </Panel>,
    );

    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '더 보기' })).toBeInTheDocument();
  });

  it('title만 넘기면 actions 없이 헤더가 뜬다', () => {
    render(<Panel title="Sessions">본문</Panel>);

    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('title과 actions가 둘 다 없으면 헤더 자체가 안 뜬다', () => {
    const { container } = render(<Panel>본문</Panel>);

    expect(container.querySelector('header')).not.toBeInTheDocument();
  });

  it('밀도를 data-density 로 드러낸다 — 값마다 어느 크기를 쓸지는 CSS가 고른다', () => {
    const { container } = render(<Panel density="compact">본문</Panel>);

    expect(container.querySelector('[data-density="compact"]')).toBeInTheDocument();
  });

  it('밀도를 안 주면 comfortable 이다', () => {
    const { container } = render(<Panel>본문</Panel>);

    expect(container.querySelector('[data-density="comfortable"]')).toBeInTheDocument();
  });
});
