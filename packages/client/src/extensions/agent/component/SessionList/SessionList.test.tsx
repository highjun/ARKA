import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsNoA11yViolations, implementsRef } from '#utils/testing';
import { SessionList } from './SessionList';
import type { AgentSessionItem } from './SessionList';
import { Menu } from '#component/Menu';

const SESSIONS: AgentSessionItem[] = [
  { id: 'a', title: '첫 세션' },
  { id: 'b', title: '둘째 세션', disabled: true },
];

const SESSIONS_WITH_ARCHIVED: AgentSessionItem[] = [...SESSIONS, { id: 'c', title: '보관된 세션', archived: true }];

describe('SessionList', () => {
  implementsClassName((extra) => <SessionList sessions={SESSIONS} {...extra} />);
  implementsDataComponent((extra) => <SessionList sessions={SESSIONS} {...extra} />, 'SessionList');
  implementsRef<HTMLDivElement>((extra) => <SessionList sessions={SESSIONS} {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => <SessionList sessions={SESSIONS} />);

  describe('Markup', () => {
    it('세션 목록을 role="listbox"로 그린다', () => {
      render(<SessionList sessions={SESSIONS} />);

      expect(screen.getByRole('listbox', { name: 'Agent sessions' })).toBeInTheDocument();
      expect(screen.getByText('첫 세션')).toBeInTheDocument();
    });

    it('세션이 없으면 안내 문구로 대체된다', () => {
      render(<SessionList sessions={[]} />);

      expect(screen.getByText('세션이 없습니다.')).toBeInTheDocument();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('emptyLabel을 커스터마이즈할 수 있다', () => {
      render(<SessionList sessions={[]} emptyLabel="비어 있음" />);

      expect(screen.getByText('비어 있음')).toBeInTheDocument();
    });

    it('heading을 커스터마이즈할 수 있다', () => {
      render(<SessionList sessions={SESSIONS} heading="진행 중" />);

      expect(screen.getByText('진행 중')).toBeInTheDocument();
    });

    it('onCreateSession을 넘겼을 때만 생성 버튼이 나타난다', () => {
      const { rerender } = render(<SessionList sessions={SESSIONS} />);

      expect(screen.queryByRole('button', { name: '새 세션 만들기' })).not.toBeInTheDocument();

      rerender(<SessionList sessions={SESSIONS} onCreateSession={() => {}} />);

      expect(screen.getByRole('button', { name: '새 세션 만들기' })).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('세션을 클릭하면 선택을 알린다', () => {
      const onActiveChange = vi.fn();
      render(<SessionList sessions={SESSIONS} onActiveChange={onActiveChange} />);

      fireEvent.click(screen.getByText('첫 세션'));

      expect(onActiveChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    });

    it('disabled 세션은 클릭해도 선택되지 않는다', () => {
      const onActiveChange = vi.fn();
      render(<SessionList sessions={SESSIONS} onActiveChange={onActiveChange} />);

      fireEvent.click(screen.getByText('둘째 세션'));

      expect(onActiveChange).not.toHaveBeenCalled();
    });

    it('생성 버튼을 클릭하면 onCreateSession을 부른다', () => {
      const onCreateSession = vi.fn();
      render(<SessionList sessions={SESSIONS} onCreateSession={onCreateSession} />);

      fireEvent.click(screen.getByRole('button', { name: '새 세션 만들기' }));

      expect(onCreateSession).toHaveBeenCalledTimes(1);
    });

    it('moreActions를 넘겼을 때만 더 보기 버튼이 나타난다', () => {
      const { rerender } = render(<SessionList sessions={SESSIONS} />);

      expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument();

      rerender(<SessionList sessions={SESSIONS} moreActions={<Menu.Item>내보내기</Menu.Item>} />);

      expect(screen.getByRole('button', { name: '더 보기' })).toBeInTheDocument();
    });

    it('더 보기 메뉴를 열면 moreActions로 넘긴 항목이 보인다', () => {
      const onSelect = vi.fn();
      render(<SessionList sessions={SESSIONS} moreActions={<Menu.Item onSelect={onSelect}>내보내기</Menu.Item>} />);

      fireEvent.pointerDown(screen.getByRole('button', { name: '더 보기' }), { button: 0 });
      fireEvent.click(screen.getByRole('menuitem', { name: '내보내기' }));

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('State', () => {
    it('defaultActiveId가 uncontrolled 시작값이 된다', () => {
      render(<SessionList sessions={SESSIONS} defaultActiveId="a" />);

      expect(screen.getByText('첫 세션').closest('[role="option"]')).toHaveAttribute('aria-selected', 'true');
    });

    it('activeId를 넘기면(controlled) 클릭해도 onActiveChange 없이는 강조가 안 바뀐다', () => {
      render(<SessionList sessions={SESSIONS} activeId="a" />);

      fireEvent.click(screen.getByText('둘째 세션'));

      expect(screen.getByText('첫 세션').closest('[role="option"]')).toHaveAttribute('aria-selected', 'true');
    });

    it('uncontrolled 모드에서 클릭한 세션이 활성 상태가 된다', () => {
      const sessions: AgentSessionItem[] = [
        { id: 'a', title: '첫 세션' },
        { id: 'c', title: '셋째 세션' },
      ];
      render(<SessionList sessions={sessions} />);

      fireEvent.click(screen.getByText('셋째 세션'));

      expect(screen.getByText('셋째 세션').closest('[role="option"]')).toHaveAttribute('aria-selected', 'true');
    });

    it('기본으로는 archived 세션을 숨기고, 필터를 켜면 나타난다', () => {
      render(<SessionList sessions={SESSIONS_WITH_ARCHIVED} />);

      expect(screen.queryByText('보관된 세션')).not.toBeInTheDocument();

      fireEvent.pointerDown(screen.getByRole('button', { name: '세션 필터' }), { button: 0 });
      fireEvent.click(screen.getByRole('menuitem', { name: '보관된 세션 표시' }));

      expect(screen.getByText('보관된 세션')).toBeInTheDocument();
    });

    it('필터를 다시 끄면 archived 세션이 사라진다', () => {
      render(<SessionList sessions={SESSIONS_WITH_ARCHIVED} />);

      fireEvent.pointerDown(screen.getByRole('button', { name: '세션 필터' }), { button: 0 });
      fireEvent.click(screen.getByRole('menuitem', { name: '보관된 세션 표시' }));
      expect(screen.getByText('보관된 세션')).toBeInTheDocument();

      fireEvent.pointerDown(screen.getByRole('button', { name: '세션 필터' }), { button: 0 });
      fireEvent.click(screen.getByRole('menuitem', { name: '보관된 세션 표시' }));

      expect(screen.queryByText('보관된 세션')).not.toBeInTheDocument();
    });
  });
});
