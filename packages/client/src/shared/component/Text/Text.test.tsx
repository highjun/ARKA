import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsRef, implementsNoA11yViolations } from '#utils/testing';
import { Text } from './Text';

describe('Text', () => {
  implementsClassName((extra) => <Text {...extra} />);
  implementsDataComponent((extra) => <Text {...extra} />, 'Text');
  implementsRef((extra) => <Text {...extra} />, HTMLSpanElement);
  implementsNoA11yViolations(() => <Text>안내 문구</Text>);

  it('variant="body", size="medium", tone="default" 가 기본값이다', () => {
    render(<Text>내용</Text>);

    expect(screen.getByText('내용')).toHaveAttribute('data-text-variant', 'body');
    expect(screen.getByText('내용')).toHaveAttribute('data-text-size', 'medium');
    expect(screen.getByText('내용')).toHaveAttribute('data-text-tone', 'default');
  });

  it('variant, size, tone props 를 data 속성에 반영한다', () => {
    render(
      <Text variant="caption" size="small" tone="muted">
        내용
      </Text>,
    );

    expect(screen.getByText('내용')).toHaveAttribute('data-text-variant', 'caption');
    expect(screen.getByText('내용')).toHaveAttribute('data-text-size', 'small');
    expect(screen.getByText('내용')).toHaveAttribute('data-text-tone', 'muted');
  });

  it.each(['body', 'caption'] as const)('variant="%s" 를 받는다', (variant) => {
    render(<Text variant={variant}>내용</Text>);

    expect(screen.getByText('내용')).toHaveAttribute('data-text-variant', variant);
  });

  it.each(['small', 'medium', 'large'] as const)('size="%s" 를 받는다', (size) => {
    render(<Text size={size}>내용</Text>);

    expect(screen.getByText('내용')).toHaveAttribute('data-text-size', size);
  });

  it.each(['default', 'muted', 'danger'] as const)('tone="%s" 를 받는다', (tone) => {
    render(<Text tone={tone}>내용</Text>);

    expect(screen.getByText('내용')).toHaveAttribute('data-text-tone', tone);
  });
});
