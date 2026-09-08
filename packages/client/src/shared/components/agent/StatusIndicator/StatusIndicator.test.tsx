import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  implementsClassName,
  implementsDataComponent,
  implementsForwardRef,
  implementsNoA11yViolations,
} from '#utils/testing';
import { StatusIndicator } from './StatusIndicator';
import type { StatusIndicatorStatus } from './StatusIndicator';

describe('StatusIndicator', () => {
  it.each<[StatusIndicatorStatus, string]>([
    ['running', '작업 중'],
    ['waitingInput', '입력 대기'],
    ['done', '완료'],
    ['error', '오류'],
  ])('status=%s 는 %s 로 읽힌다', (status, label) => {
    const { container } = render(<StatusIndicator status={status} />);
    const indicator = container.querySelector('[data-component="StatusIndicator"]');

    expect(indicator).toHaveAttribute('data-status', status);
    expect(indicator).toHaveAttribute('aria-label', label);
  });

  it('role="img" 을 갖는다 — span 은 role 없이 aria-label 을 못 갖는다(aria-prohibited-attr)', () => {
    const { container } = render(<StatusIndicator status="running" />);

    expect(container.querySelector('[data-component="StatusIndicator"]')).toHaveAttribute('role', 'img');
  });

  implementsClassName((extra) => <StatusIndicator status="running" {...extra} />);
  implementsDataComponent((extra) => <StatusIndicator status="running" {...extra} />, 'StatusIndicator');
  implementsForwardRef((extra) => <StatusIndicator status="running" {...extra} />, HTMLSpanElement);
  implementsNoA11yViolations(() => <StatusIndicator status="running" />);
});
