import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '#utils/axe';
import { implementsClassName, implementsDataComponent, implementsRef } from '#utils/testing';
import { Dialog } from './Dialog';

const Demo = (extra: Record<string, unknown> = {}) => (
  <Dialog onClose={() => {}} iconId="warning" title="제목" description="설명" {...extra}>
    <Dialog.Actions>
      <button type="button">확인</button>
    </Dialog.Actions>
  </Dialog>
);

describe('Dialog', () => {
  it('마운트되면 열려 있다 — 제목·설명·children이 보인다', () => {
    render(<Demo />);

    expect(screen.getByText('제목')).toBeInTheDocument();
    expect(screen.getByText('설명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  });

  it('Escape를 누르면 onClose를 부른다', () => {
    const onClose = vi.fn();
    render(<Demo onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('닫기 버튼을 누르면 onClose를 부른다', () => {
    const onClose = vi.fn();
    render(<Demo onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '대화상자 닫기' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('description을 접근성 설명으로 노출한다', () => {
    render(<Demo />);

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('설명');
  });

  it('tone을 아이콘의 data-tone으로 노출한다(기본값 default)', () => {
    const { rerender } = render(<Demo />);

    // Content는 Portal로 document.body로 빠져나간다 — render()가 돌려주는 container는
    // 그 형제라 안 잡힌다.
    expect(document.body.querySelector('[data-tone="default"]')).toBeInTheDocument();

    rerender(<Demo tone="danger" />);

    expect(document.body.querySelector('[data-tone="danger"]')).toBeInTheDocument();
  });

  implementsDataComponent(Demo, 'Dialog');
  implementsClassName(Demo);
  implementsRef(Demo, HTMLDivElement);

  it('axe 접근성 위반이 없다(Portal로 빠져나간 실제 내용)', async () => {
    render(<Demo />);

    // Content 는 Portal로 document.body 로 빠져나간다 — render()가 돌려주는 container 는
    // 그 형제라 안 잡힌다. 실제로 뜬 걸 검사하려면 body 를 봐야 한다.
    await expectNoA11yViolations(document.body);
  });
});
