import { describe, expect, it } from 'vitest';
import { ErrorLog } from '../model/ErrorLog';
import { createGlobalErrorHandlers } from './GlobalErrorHandlers';

describe('createGlobalErrorHandlers', () => {
  it('window.error를 기록한다', () => {
    const errorLog = new ErrorLog();
    const handlers = createGlobalErrorHandlers({ errorLog });
    handlers.start();
    const event = new ErrorEvent('error', { error: new Error('boom'), message: 'boom', cancelable: true });
    window.dispatchEvent(event);
    handlers.stop();
    expect(errorLog.entries.map((entry) => [entry.source, entry.message])).toEqual([['window.error', 'boom']]);
  });

  it('unhandledrejection을 기록한다', () => {
    const errorLog = new ErrorLog();
    const handlers = createGlobalErrorHandlers({ errorLog });
    handlers.start();
    // jsdom에는 `PromiseRejectionEvent`가 없다 — 같은 모양의 이벤트를 손으로 만든다.
    const event = Object.assign(new Event('unhandledrejection'), { reason: new Error('rejected') });
    window.dispatchEvent(event);
    handlers.stop();
    expect(errorLog.entries.map((entry) => [entry.source, entry.message])).toEqual([['unhandledrejection', 'rejected']]);
  });

  it('stop 뒤에는 기록하지 않는다', () => {
    const errorLog = new ErrorLog();
    const handlers = createGlobalErrorHandlers({ errorLog });
    handlers.start();
    handlers.stop();
    // `error` 객체를 실으면 vitest 자신의 리스너가 "잡히지 않은 오류"로 집는다 — 메시지만 싣는다.
    window.dispatchEvent(new ErrorEvent('error', { message: 'late' }));
    expect(errorLog.entries).toHaveLength(0);
  });
});
