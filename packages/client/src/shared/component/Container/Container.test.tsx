import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Container } from './Container';

/** 다섯 조각을 감싼 구조가 계약대로 동작하는지 본다 — 내용은 Viewport 안에 들어가고 ref 도 거기 꽂힌다. */
describe('Container', () => {
  it('children 을 Viewport 안에 렌더링하고 ref 도 거기에 넘긴다', () => {
    const ref = createRef<HTMLDivElement>();

    render(<Container ref={ref}>content</Container>);

    expect(screen.getByText('content')).toBeInTheDocument();
    expect(ref.current).toContainElement(screen.getByText('content'));
  });

  implementsClassName((extra) => <Container {...extra}>content</Container>);
  implementsDataComponent((extra) => <Container {...extra}>content</Container>, 'Container');
  implementsNoA11yViolations(() => <Container>content</Container>);
  implementsForwardRef((extra) => <Container {...extra}>content</Container>, HTMLDivElement);

  it('chrome 을 data-chrome 으로 노출한다', () => {
    const { container } = render(<Container chrome="none">content</Container>);

    expect(container.querySelector('[data-chrome="none"]')).toBeInTheDocument();
  });

  describe('scroll="none"', () => {
    it('Radix ScrollArea 없이 순수 div로 렌더한다 — 스크롤바 파츠가 없다', () => {
      const { container } = render(<Container scroll="none">content</Container>);

      expect(screen.getByText('content')).toBeInTheDocument();
      expect(container.querySelectorAll('[data-radix-scroll-area-viewport]')).toHaveLength(0);
    });

    it('ref 를 그 div 에 직접 꽂는다', () => {
      const ref = createRef<HTMLDivElement>();

      render(
        <Container ref={ref} scroll="none">
          content
        </Container>,
      );

      expect(ref.current).toContainElement(screen.getByText('content'));
    });

    it('data-scroll="none" 을 노출한다', () => {
      const { container } = render(<Container scroll="none">content</Container>);

      expect(container.querySelector('[data-scroll="none"]')).toBeInTheDocument();
    });

    implementsClassName((extra) => (
      <Container scroll="none" {...extra}>
        content
      </Container>
    ));
    implementsDataComponent(
      (extra) => (
        <Container scroll="none" {...extra}>
          content
        </Container>
      ),
      'Container',
    );
    implementsNoA11yViolations(() => <Container scroll="none">content</Container>);
  });
});
