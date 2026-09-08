import { afterEach, describe, expect, it } from 'vitest';
import { createAgentApiPort } from './HttpAgentApi';

type Call = { url: string; method: string; body: string | undefined; headers: Record<string, string> };
const originalFetch = globalThis.fetch;
const serverReplies = (body: unknown, status = 200) => {
  const calls: Call[] = [];
  globalThis.fetch = ((input: unknown, init?: { method?: string; body?: string; headers?: Record<string, string> }) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body, headers: init?.headers ?? {} });
    return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;
  return calls;
};
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const session = { id: 's1', title: 't', createdAt: 1, updatedAt: 1, archived: false, lastRunStatus: null };

describe('HttpAgentApi', () => {
  it('목록을 계약대로 읽는다', async () => {
    const calls = serverReplies({ sessions: [session] });
    expect(await createAgentApiPort().listSessions()).toEqual([session]);
    expect(calls[0]).toMatchObject({ url: '/api/agent/sessions', method: 'GET' });
    expect(calls[0]?.headers['x-ade-protocol']).toBe('1');
  });

  it('세션을 만들고 Run을 시작한다', async () => {
    const calls = serverReplies({ session });
    await createAgentApiPort().createSession('t');
    expect(calls[0]).toMatchObject({ method: 'POST', body: JSON.stringify({ title: 't' }) });
    globalThis.fetch = originalFetch;
    const runs = serverReplies({ runId: 'r', status: 'running' });
    expect(await createAgentApiPort().startRun('s1', 'hi', 'plan')).toEqual({ runId: 'r', status: 'running' });
    expect(runs[0]).toMatchObject({ url: '/api/agent/sessions/s1/runs', body: JSON.stringify({ input: 'hi', mode: 'plan' }) });
  });

  it('실패하면 상태와 서버 사유를 담아 던진다', async () => {
    serverReplies({ code: 'RunInProgress', message: 'already running' }, 409);
    await expect(createAgentApiPort().startRun('s1', 'x', 'action')).rejects.toThrow(/409.*already running/u);
  });

  it('응답이 계약에 어긋나면 던진다', async () => {
    serverReplies({ sessions: [{ id: 1 }] });
    await expect(createAgentApiPort().listSessions()).rejects.toThrow();
  });
});
