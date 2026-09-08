import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Collapsible } from './Collapsible';

/**
 * 클릭→토글 인터랙션은 검사하지 않는다 — jsdom 이 네이티브 `<details>`의 클릭 토글을 구현하지
 * 않아 `fireEvent.click`이 실제 토글을 일으키지 못한다. 여기서는 controlled `open` prop 이
 * 초기 렌더에 그대로 반영되는지만 본다.
 */
describe('Collapsible', () => {
  it('renders content when open is true', () => {
    render(
      <Collapsible open>
        <Collapsible.Trigger>자세히</Collapsible.Trigger>
        <Collapsible.Content>내용</Collapsible.Content>
      </Collapsible>,
    );

    expect(screen.getByText('내용')).toBeInTheDocument();
    expect(screen.getByText('자세히').closest('details')).toHaveAttribute('open');
  });

  it('does not render the open attribute when open is false', () => {
    render(
      <Collapsible open={false}>
        <Collapsible.Trigger>자세히</Collapsible.Trigger>
        <Collapsible.Content>내용</Collapsible.Content>
      </Collapsible>,
    );

    expect(screen.getByText('자세히').closest('details')).not.toHaveAttribute('open');
  });

  implementsDataComponent(
    (extra) => (
      <Collapsible open {...extra}>
        <Collapsible.Trigger>자세히</Collapsible.Trigger>
        <Collapsible.Content>내용</Collapsible.Content>
      </Collapsible>
    ),
    'Collapsible',
  );

  it('Trigger 안에 chevron 아이콘이 실제로 들어간다 — styled.tsx가 하던 조립이 실제로 동작하는지', () => {
    render(
      <Collapsible open>
        <Collapsible.Trigger>자세히</Collapsible.Trigger>
        <Collapsible.Content>내용</Collapsible.Content>
      </Collapsible>,
    );

    expect(screen.getByText('자세히').closest('summary')?.querySelector('[data-chevron]')).toBeInTheDocument();
  });

  it('open 여부에 따라 chevron 아이콘 자체가 바뀐다(회전이 아니다)', () => {
    const { rerender } = render(
      <Collapsible open={false}>
        <Collapsible.Trigger>자세히</Collapsible.Trigger>
        <Collapsible.Content>내용</Collapsible.Content>
      </Collapsible>,
    );
    expect(screen.getByText('자세히').closest('summary')?.querySelector('[data-icon="chevronRight"]')).toBeInTheDocument();

    rerender(
      <Collapsible open>
        <Collapsible.Trigger>자세히</Collapsible.Trigger>
        <Collapsible.Content>내용</Collapsible.Content>
      </Collapsible>,
    );
    expect(screen.getByText('자세히').closest('summary')?.querySelector('[data-icon="chevronDown"]')).toBeInTheDocument();
  });

  implementsForwardRef(
    (extra) => (
      <Collapsible open {...extra}>
        <Collapsible.Trigger>자세히</Collapsible.Trigger>
        <Collapsible.Content>내용</Collapsible.Content>
      </Collapsible>
    ),
    HTMLDetailsElement,
  );

  implementsClassName((extra) => (
    <Collapsible open {...extra}>
      <Collapsible.Trigger>자세히</Collapsible.Trigger>
      <Collapsible.Content>내용</Collapsible.Content>
    </Collapsible>
  ));

  implementsNoA11yViolations(() => (
    <Collapsible open>
      <Collapsible.Trigger>자세히</Collapsible.Trigger>
      <Collapsible.Content>내용</Collapsible.Content>
    </Collapsible>
  ));
});
