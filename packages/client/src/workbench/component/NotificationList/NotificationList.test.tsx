import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsNoA11yViolations, implementsRef } from '#utils/testing';
import { NotificationList } from './NotificationList';

const ITEMS = [{ id: '1', severity: 'error' as const, message: '저장하지 못했다' }];

describe('NotificationList', () => {
  it('비어 있으면 아무것도 그리지 않는다', () => {
    const { container } = render(<NotificationList items={[]} onDismiss={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('알림을 그리고 닫기를 누르면 onDismiss를 부른다', () => {
    const onDismiss = vi.fn();
    render(<NotificationList items={[{ id: 'a', severity: 'error', message: '실패했다' }]} onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('실패했다');
    fireEvent.click(screen.getByRole('button', { name: '알림 닫기' }));
    expect(onDismiss).toHaveBeenCalledWith('a');
  });

  implementsClassName((extra) => <NotificationList items={ITEMS} onDismiss={() => undefined} {...extra} />);
  implementsDataComponent((extra) => <NotificationList items={ITEMS} onDismiss={() => undefined} {...extra} />, 'NotificationList');
  implementsRef<HTMLDivElement>((extra) => <NotificationList items={ITEMS} onDismiss={() => undefined} {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => <NotificationList items={ITEMS} onDismiss={() => undefined} />);
});
