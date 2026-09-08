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

  it('tone="accent" 가 기본값이고 Primer muted 는 켜지 않는다', () => {
    render(<Link href="#">링크</Link>);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('data-tone', 'accent');
    expect(link).not.toHaveAttribute('data-muted', 'true');
  });

  it('tone="muted" 를 Primer muted 로 넘긴다', () => {
    render(
      <Link href="#" tone="muted">
        링크
      </Link>,
    );

    expect(screen.getByRole('link')).toHaveAttribute('data-muted', 'true');
  });

  it('tone="plain" 을 data-tone 에 반영한다', () => {
    render(
      <Link href="#" tone="plain">
        링크
      </Link>,
    );

    expect(screen.getByRole('link')).toHaveAttribute('data-tone', 'plain');
  });
});
