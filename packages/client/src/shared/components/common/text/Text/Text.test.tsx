import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Text } from './Text';

describe('Text', () => {
  implementsClassName((extra) => <Text {...extra} />);
  implementsDataComponent((extra) => <Text {...extra} />, 'Text');
  implementsForwardRef((extra) => <Text {...extra} />, HTMLSpanElement);
  implementsNoA11yViolations(() => <Text>안내 문구</Text>);

  it('defaults to variant="body", size="medium" and tone="default"', () => {
    render(<Text>내용</Text>);

    expect(screen.getByText('내용')).toHaveAttribute('data-text-variant', 'body');
    expect(screen.getByText('내용')).toHaveAttribute('data-text-size', 'medium');
    expect(screen.getByText('내용')).toHaveAttribute('data-text-tone', 'default');
  });

  it('reflects the variant, size and tone props', () => {
    render(
      <Text variant="caption" size="small" tone="muted">
        내용
      </Text>,
    );

    expect(screen.getByText('내용')).toHaveAttribute('data-text-variant', 'caption');
    expect(screen.getByText('내용')).toHaveAttribute('data-text-size', 'small');
    expect(screen.getByText('내용')).toHaveAttribute('data-text-tone', 'muted');
  });

  it.each(['body', 'caption'] as const)('accepts variant="%s"', (variant) => {
    render(<Text variant={variant}>내용</Text>);

    expect(screen.getByText('내용')).toHaveAttribute('data-text-variant', variant);
  });

  it.each(['small', 'medium', 'large'] as const)('accepts size="%s"', (size) => {
    render(<Text size={size}>내용</Text>);

    expect(screen.getByText('내용')).toHaveAttribute('data-text-size', size);
  });

  it.each(['default', 'muted', 'danger'] as const)('accepts tone="%s"', (tone) => {
    render(<Text tone={tone}>내용</Text>);

    expect(screen.getByText('내용')).toHaveAttribute('data-text-tone', tone);
  });
});
