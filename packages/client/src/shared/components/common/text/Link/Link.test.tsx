import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Link } from './Link';

describe('Link', () => {
  implementsClassName((extra) => (
    <Link href="#" {...extra}>
      링크
    </Link>
  ));
  implementsDataComponent(
    (extra) => (
      <Link href="#" {...extra}>
        링크
      </Link>
    ),
    'Link',
  );
  implementsForwardRef(
    (extra) => (
      <Link href="#" {...extra}>
        링크
      </Link>
    ),
    HTMLAnchorElement,
  );
  implementsNoA11yViolations(() => <Link href="#">링크</Link>);

  it('defaults to tone="accent" and does not set Primer muted', () => {
    render(<Link href="#">링크</Link>);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('data-tone', 'accent');
    expect(link).not.toHaveAttribute('data-muted', 'true');
  });

  it('forwards tone="muted" to Primer muted', () => {
    render(
      <Link href="#" tone="muted">
        링크
      </Link>,
    );

    expect(screen.getByRole('link')).toHaveAttribute('data-muted', 'true');
  });

  it('reflects tone="plain"', () => {
    render(
      <Link href="#" tone="plain">
        링크
      </Link>,
    );

    expect(screen.getByRole('link')).toHaveAttribute('data-tone', 'plain');
  });
});
