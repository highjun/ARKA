import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from '#utils/testing';
import { Timestamp } from './Timestamp';

const FIXED_NOW = 1_700_000_000_000;
/** `formatDateTime`이 로컬 타임존 기준(`getFullYear`/`getMonth`/`getDate`)이라 실행 환경마다
 * 날짜가 달라질 수 있다 — `shared.test.ts`와 같은 이유로 하드코딩 대신 직접 계산한다. */
const expectedDate = (epoch: number) => {
  const d = new Date(epoch);
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('Timestamp', () => {
  implementsClassName((extra) => <Timestamp epoch={FIXED_NOW} mode="datetime" {...extra} />);
  implementsDataComponent((extra) => <Timestamp epoch={FIXED_NOW} mode="datetime" {...extra} />, 'Timestamp');
  implementsRef((extra) => <Timestamp epoch={FIXED_NOW} mode="datetime" {...extra} />, HTMLSpanElement);
  implementsNoA11yViolations(() => <Timestamp epoch={FIXED_NOW} mode="relative" now={FIXED_NOW} />);

  it('포맷된 텍스트를 화면과 aria-label 양쪽에 싣는다', () => {
    render(<Timestamp epoch={FIXED_NOW} mode="datetime" format="YYYY-MM-DD" />);

    const el = screen.getByText(expectedDate(FIXED_NOW));
    expect(el).toHaveAttribute('aria-label', `시각: ${expectedDate(FIXED_NOW)}`);
  });

  it('epoch 대신 date 객체로도 렌더된다', () => {
    render(<Timestamp date={new Date(FIXED_NOW)} mode="datetime" format="YYYY-MM-DD" />);

    expect(screen.getByText(expectedDate(FIXED_NOW))).toBeInTheDocument();
  });

  it('duration 모드도 실제로 렌더된다', () => {
    render(<Timestamp epoch={FIXED_NOW - (4 * 60 + 2) * 60 * 1000} now={FIXED_NOW} mode="duration" />);

    expect(screen.getByText('04시간 02분')).toBeInTheDocument();
  });
});
