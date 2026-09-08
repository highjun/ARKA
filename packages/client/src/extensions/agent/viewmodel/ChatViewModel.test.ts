import { describe, expect, it } from 'vitest';
import { ChatModel } from '../model/ChatModel';
import { MockAgentBackend } from '../model/MockAgentBackend';
import { ChatViewModel } from './ChatViewModel';

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
const make = (backend = new MockAgentBackend({ now: () => 5 })) => {
  const model = new ChatModel({ api: backend, events: backend });
  const viewModel = new ChatViewModel({ chatModel: model });
  viewModel.onMount();
  return { backend, model, viewModel };
};

describe('ChatViewModel', () => {
  it('마운트하면 목록을 읽고 행으로 바꾼다 — 빈 제목은 "새 대화"', async () => {
    const backend = new MockAgentBackend({ now: () => 5 });
    await backend.createSession();
    const { viewModel } = make(backend);
    await settled();
    expect(viewModel.sessionsLoading).toBe(false);
    expect(viewModel.sessions).toEqual([{ id: 'id1', title: '새 대화', status: null, archived: false, timestamp: 5 }]);
  });

  it('초안을 보내면 비워지고 대화에 사용자·답변이 쌓인다', async () => {
    const { viewModel } = make();
    const id = await viewModel.createSession();
    if (id === null) throw new Error('세션이 없다');
    viewModel.openSession(id);
    viewModel.setDraft(id, '안녕');
    expect(viewModel.chatOf(id).composer.canSubmit).toBe(true);
    viewModel.submit(id);
    expect(viewModel.chatOf(id).composer.value).toBe('');
    await settled();
    const state = viewModel.chatOf(id);
    expect(state.items.map((i) => i.kind)).toEqual(['user', 'thinking', 'tool', 'assistant']);
    expect(state.status).toBe('done');
    expect(state.composer.sending).toBe(false);
  });

  it('빈 초안은 보낼 수 없다', async () => {
    const { viewModel } = make();
    const id = (await viewModel.createSession()) ?? '';
    viewModel.setDraft(id, '   ');
    expect(viewModel.chatOf(id).composer.canSubmit).toBe(false);
    viewModel.submit(id);
    expect(viewModel.chatOf(id).items).toEqual([]);
  });

  it('입력 대기 중이면 placeholder가 질문이고 보낼 수 있다', async () => {
    const backend = new MockAgentBackend({ script: (_i, _m, { next }) => [{ type: 'input.requested', requestId: next(), prompt: '이름?' }] });
    const { viewModel } = make(backend);
    const id = (await viewModel.createSession()) ?? '';
    viewModel.openSession(id);
    viewModel.setDraft(id, 'q');
    viewModel.submit(id);
    await settled();
    const state = viewModel.chatOf(id);
    expect(state.status).toBe('waitingInput');
    expect(state.composer.placeholder).toBe('이름?');
    viewModel.setDraft(id, '준');
    expect(viewModel.chatOf(id).composer.canSubmit).toBe(true);
  });

  it('plan 모드를 고르면 그 모드로 보낸다', async () => {
    const { backend, viewModel } = make();
    const id = (await viewModel.createSession()) ?? '';
    viewModel.openSession(id);
    viewModel.setMode(id, 'plan');
    viewModel.setDraft(id, 'x');
    viewModel.submit(id);
    await settled();
    expect(backend.eventsOf(id).find((e) => e.type === 'run.started')).toMatchObject({ mode: 'plan' });
  });

  it('열지 않은 세션의 chatOf는 빈 대화다', async () => {
    const { viewModel } = make();
    expect(viewModel.chatOf('nope')).toMatchObject({ items: [], status: null, canCancel: false, composer: { value: '', canSubmit: false } });
  });
});
