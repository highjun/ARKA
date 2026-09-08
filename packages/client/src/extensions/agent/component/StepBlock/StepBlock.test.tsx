import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { StepBlock } from './StepBlock';
import type { StatusIndicatorStatus } from '../StatusIndicator';

/**
 * 클릭→토글 인터랙션은 검사하지 않는다 — jsdom 이 네이티브 `<details>`의 클릭 토글을 구현하지
 * 않는다([[Collapsible/Collapsible.test.tsx]]와 같은 이유). `defaultExpanded` 로 펼쳐둔 초기 상태의
 * 렌더링만 검증한다.
 */
describe('StepBlock', () => {
  implementsClassName((extra) => <StepBlock kind="thinking" {...extra} defaultExpanded />);
  implementsDataComponent((extra) => <StepBlock kind="thinking" {...extra} defaultExpanded />, 'StepBlock');
  implementsForwardRef((extra) => <StepBlock kind="thinking" {...extra} defaultExpanded />, HTMLDetailsElement);
  implementsNoA11yViolations(() => <StepBlock kind="thinking" defaultExpanded summary="내용" />);

  describe('kind="thinking"', () => {
    it('data-kind="thinking" 을 루트에 반영한다', () => {
      const { container } = render(<StepBlock kind="thinking" defaultExpanded />);

      expect(container.querySelector('[data-kind="thinking"]')).toBeInTheDocument();
    });

    it('renders the summary when expanded', () => {
      render(<StepBlock kind="thinking" summary="내용" defaultExpanded />);

      expect(screen.getByText('내용')).toBeInTheDocument();
    });

    it('shows the empty label when there is no summary', () => {
      render(<StepBlock kind="thinking" defaultExpanded />);

      expect(screen.getByText('생각 내용이 없습니다.')).toBeInTheDocument();
    });

    it('shows a custom empty label when provided', () => {
      render(<StepBlock kind="thinking" defaultExpanded emptyLabel="커스텀 안내" />);

      expect(screen.getByText('커스텀 안내')).toBeInTheDocument();
    });

    it.each<[StatusIndicatorStatus, string]>([
      ['running', '작업 중'],
      ['done', '완료'],
      ['waitingInput', '입력 대기'],
      ['error', '오류'],
    ])('status=%s 는 StatusIndicator 라벨 %s 로 읽힌다', (status, label) => {
      render(<StepBlock kind="thinking" defaultExpanded status={status} />);
      expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
    });
  });

  describe('kind="tool"', () => {
    it('data-kind="tool" 을 루트에 반영한다', () => {
      const { container } = render(<StepBlock kind="tool" toolId="read_file" defaultExpanded />);

      expect(container.querySelector('[data-kind="tool"]')).toBeInTheDocument();
    });

    it.each<[StatusIndicatorStatus, string]>([
      ['running', '작업 중'],
      ['done', '완료'],
      ['waitingInput', '입력 대기'],
      ['error', '오류'],
    ])('status=%s 는 StatusIndicator 라벨 %s 로 읽힌다', (status, label) => {
      render(<StepBlock kind="tool" toolId="read_file" status={status} />);
      expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
    });

    it('renders input/output when expanded and body exists', () => {
      render(<StepBlock kind="tool" toolId="read_file" toolInput={{ path: 'a.ts' }} defaultExpanded />);

      expect(screen.getByText(/a\.ts/)).toBeInTheDocument();
    });

    it('never expands when there is no input or output, even if expanded is forced', () => {
      render(<StepBlock kind="tool" toolId="read_file" expanded />);

      expect(screen.getByText('read_file').closest('details')).not.toHaveAttribute('open');
    });
  });
});
