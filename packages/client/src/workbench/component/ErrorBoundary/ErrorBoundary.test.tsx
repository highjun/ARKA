import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

const Bomb = (): never => {
  throw new Error('폭발');
};

describe('ErrorBoundary', () => {
  // React가 잡힌 오류를 console.error로도 내보낸다 — 테스트 출력이 그걸로 덮이지 않게 막는다.
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('자식이 멀쩡하면 그대로 그린다', () => {
    render(<ErrorBoundary renderFallback={() => '대체'}>본문</ErrorBoundary>);
    expect(screen.getByText('본문')).toBeInTheDocument();
  });

  it('자식이 던지면 fallback을 그리고 onError를 부른다', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary renderFallback={(error) => `대체: ${error.message}`} onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('대체: 폭발')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});
