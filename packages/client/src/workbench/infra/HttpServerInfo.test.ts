import { PROTOCOL_HEADER } from '#contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { testServerInfoContract } from '../model/serverInfo.contract';
import { createServerInfoPort } from './HttpServerInfo';

const originalFetch = globalThis.fetch;
const serverReplies = (body: unknown, status = 200): void => {
  globalThis.fetch = (() => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })) as unknown as typeof fetch;
};
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('HttpServerInfo', () => {
  it('계약대로 온 답을 그대로 준다', async () => {
    serverReplies({ builtAt: '2026-09-09T00:00:00.000Z', protocolVersion: 1, protocolHeader: PROTOCOL_HEADER, workspaceName: 'ws' });
    expect(await createServerInfoPort().load()).toEqual({ builtAt: '2026-09-09T00:00:00.000Z', protocolVersion: 1, protocolHeader: PROTOCOL_HEADER, workspaceName: 'ws' });
  });

  it('계약에 어긋나면 null이다 — 던지지 않는다', async () => {
    serverReplies({ builtAt: 'x' });
    expect(await createServerInfoPort().load()).toBeNull();
  });

  it('실패 응답이면 null이다', async () => {
    serverReplies(null, 500);
    expect(await createServerInfoPort().load()).toBeNull();
  });

  it('네트워크가 던져도 null이다', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    expect(await createServerInfoPort().load()).toBeNull();
  });
});

// Mock이 통과하는 스위트를 실물도 통과해야 한다(→ ADR 0008). 아래 단위 테스트는 계약이 못 잡는
// 것 — 어떤 경로로 `null`이 되는지(상태 코드·스키마 위반·네트워크) — 만 따로 본다.
testServerInfoContract('HttpServerInfo', {
  answering: (sample) => {
    serverReplies(sample);
    return createServerInfoPort();
  },
  silent: () => {
    serverReplies(null, 503);
    return createServerInfoPort();
  },
});
