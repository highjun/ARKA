import { describe, expect, it, vi } from 'vitest';
import { NotificationService } from './NotificationService';

const make = () => {
  let id = 0;
  return new NotificationService({ now: () => 7, newId: () => `n${String(++id)}` });
};

describe('NotificationService', () => {
  it('알림을 띄우고 id를 돌려주며 알린다', () => {
    const service = make();
    const listener = vi.fn();
    service.onDidChange(listener);
    expect(service.notify('error', '실패')).toBe('n1');
    expect(service.notifications).toEqual([{ id: 'n1', severity: 'error', message: '실패', at: 7 }]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('같은 메시지는 하나로 합친다', () => {
    const service = make();
    expect(service.notify('error', '끊김')).toBe(service.notify('error', '끊김'));
    expect(service.notifications).toHaveLength(1);
    service.notify('info', '끊김');
    expect(service.notifications).toHaveLength(2);
  });

  it('닫으면 사라지고, 없는 id는 아무 일도 없다', () => {
    const service = make();
    const listener = vi.fn();
    const id = service.notify('info', 'a');
    service.onDidChange(listener);
    service.dismiss(id);
    service.dismiss(id);
    expect(service.notifications).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('상한을 넘으면 오래된 것부터 버린다', () => {
    const service = make();
    for (let i = 0; i < NotificationService.MAX + 2; i += 1) service.notify('info', String(i));
    expect(service.notifications).toHaveLength(NotificationService.MAX);
    expect(service.notifications[0]?.message).toBe('2');
  });
});
