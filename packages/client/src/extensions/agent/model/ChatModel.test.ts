import { describe, expect, it, vi } from 'vitest';
import { ChatModel } from './ChatModel';
import { MockAgentBackend } from './MockAgentBackend';

const make = () => {
  const backend = new MockAgentBackend({ now: () => 1 });
  const model = new ChatModel({ api: backend, events: backend });
  return { backend, model };
};

describe('ChatModel', () => {
  it('목록을 읽고 상태를 옮긴다', async () => {
    const { backend, model } = make();
    await backend.createSession('a');
    const listener = vi.fn();
    model.onDidChange(listener);
    await model.loadSessions();
    expect(model.sessionsStatus).toBe('loaded');
    expect(model.sessions.map((s) => s.title)).toEqual(['a']);
    expect(listener).toHaveBeenCalled();
  });

  it('목록 읽기가 실패하면 error와 사유가 남고 던지지 않는다', async () => {
    const { model } = make();
    const broken = new ChatModel({ api: { ...new MockAgentBackend(), listSessions: () => Promise.reject(new Error('끊김')) } as never, events: new MockAgentBackend() });
    await broken.loadSessions();
    expect(broken.sessionsStatus).toBe('error');
    expect(broken.sessionsFailure).toBe('끊김');
    expect(model.sessionsStatus).toBe('idle');
  });

  it('새 세션은 목록 맨 앞에 온다', async () => {
    const { model } = make();
    await model.loadSessions();
    const created = await model.createSession();
    expect(model.sessions[0]?.id).toBe(created.id);
  });

  it('open은 멱등이고 이벤트를 대화로 접는다', async () => {
    const { model } = make();
    const session = await model.createSession();
    model.open(session.id);
    model.open(session.id);
    await model.send(session.id, '안녕', 'action');
    const chat = model.chats[session.id];
    expect(chat?.connection).toBe('live');
    expect(chat?.items.map((i) => i.kind)).toEqual(['user', 'thinking', 'tool', 'assistant']);
    expect(chat?.runStatus).toBe('done');
    expect(model.sessions[0]).toMatchObject({ title: '안녕', lastRunStatus: 'done' });
  });

  it('입력 대기 중의 send는 답으로 보낸다', async () => {
    const backend = new MockAgentBackend({
      script: (_input, _mode, { next }) => [{ type: 'input.requested', requestId: next(), prompt: '이름?' }],
    });
    const model = new ChatModel({ api: backend, events: backend });
    const session = await model.createSession();
    model.open(session.id);
    await model.send(session.id, '질문?', 'action');
    expect(model.chats[session.id]?.pendingInput).toMatchObject({ prompt: '이름?' });
    await model.send(session.id, '준', 'action');
    expect(model.chats[session.id]?.pendingInput).toBeNull();
    expect(model.chats[session.id]?.items.at(-1)).toMatchObject({ kind: 'assistant', text: '준님, 알겠다.' });
  });

  it('보내기가 실패하면 failure에 남고 다음 성공에 지워진다', async () => {
    const { backend, model } = make();
    const session = await model.createSession();
    model.open(session.id);
    const original = backend.startRun.bind(backend);
    backend.startRun = () => Promise.reject(new Error('서버 오류'));
    await model.send(session.id, 'x', 'action');
    expect(model.chats[session.id]?.failure).toBe('서버 오류');
    backend.startRun = original;
    await model.send(session.id, 'x', 'action');
    expect(model.chats[session.id]?.failure).toBeNull();
  });

  it('close하면 구독이 끊기고 대화가 사라진다', async () => {
    const { model } = make();
    const session = await model.createSession();
    model.open(session.id);
    model.close(session.id);
    expect(model.chats[session.id]).toBeUndefined();
    await model.send(session.id, 'x', 'action');
    // 닫힌 뒤의 이벤트는 접히지 않는다 — 열려 있지 않으니 chats에 아무것도 없다.
    expect(model.chats[session.id]?.items ?? []).toEqual([]);
  });
});
