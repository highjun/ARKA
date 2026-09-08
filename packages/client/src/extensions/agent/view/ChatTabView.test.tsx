import { createContainer, singleton, scoped } from '#core/di';
import { ViewModelProvider } from '#core/viewmodel';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatModel } from '../model/ChatModel';
import { ChatModelToken } from '../model/IChatModel';
import { MockAgentBackend } from '../model/MockAgentBackend';
import { ChatViewModel } from '../viewmodel/ChatViewModel';
import { ChatViewModelToken } from '../viewmodel/IChatViewModel';
import { ChatTabView } from './ChatTabView';

/** 렌더와 이벤트 연결만 본다 — 스타일은 Storybook 담당이다. */
const mount = async () => {
  const backend = new MockAgentBackend({ now: () => 1 });
  const session = await backend.createSession('t');
  const container = createContainer('test');
  container.register(ChatModelToken, singleton(() => new ChatModel({ api: backend, events: backend })));
  container.register(ChatViewModelToken, scoped((c) => new ChatViewModel({ chatModel: c.resolve(ChatModelToken) })));
  render(
    <ViewModelProvider container={container.createScope('view')}>
      <ChatTabView sessionId={session.id} />
    </ViewModelProvider>,
  );
  return { backend, session };
};

describe('ChatTabView', () => {
  it('빈 대화를 그리고, 보내면 사용자 메시지와 답변이 뜬다', async () => {
    await mount();
    expect(screen.getByText(/아직 메시지가 없다/u)).toBeInTheDocument();
    const textarea = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '안녕' } });
    });
    await act(async () => {
      fireEvent.submit(textarea.closest('form') as HTMLFormElement);
    });
    expect(await screen.findByText('받은 입력: 안녕')).toBeInTheDocument();
    expect(screen.getByText('안녕')).toBeInTheDocument();
  });
});
