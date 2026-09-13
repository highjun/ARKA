import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsRef, implementsNoA11yViolations } from '#utils/testing';
import { Heading } from './Heading';

describe('Heading', () => {
  implementsClassName((extra) => (
    <Heading level={2} {...extra}>
      내용
    </Heading>
  ));
  implementsDataComponent(
    (extra) => (
      <Heading level={2} {...extra}>
        내용
      </Heading>
    ),
    'Heading',
  );
  implementsRef(
    (extra) => (
      <Heading level={2} {...extra}>
        내용
      </Heading>
    ),
    HTMLHeadingElement,
  );
  implementsNoA11yViolations(() => <Heading level={2}>제목</Heading>);

  it.each([1, 2, 3, 4, 5, 6] as const)('level=%i이면 h%i 태그와 data-heading-level을 갖는다', (level) => {
    render(<Heading level={level}>제목</Heading>);

    const heading = screen.getByRole('heading', { level });
    expect(heading.tagName).toBe(`H${level}`);
    expect(heading).toHaveAttribute('data-heading-level', String(level));
  });
});
