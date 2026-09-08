import { createContainer, singleton, scoped } from '#core/di';
import { ViewModelProvider } from '#core/view-model';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatModel } from '../model/ChatModel';
import { ChatModelToken } from '../model/IChatModel';
import { MockAgentBackend } from '../model/MockAgentBackend';
import { ChatViewModel } from '../viewmodel/ChatViewModel';
import { ChatViewModelToken } from '../viewmodel/IChatViewModel';
import { ChatSessionsView } from './ChatSessionsView';

const mount = async (onOpenTab = vi.fn()) => {
  const backend = new MockAgentBackend({ now: () => 1 });
  await backend.createSession('첫 대화');
  const container = createContainer('test');
  container.register(ChatModelToken, singleton(() => new ChatModel({ api: backend, events: backend })));
  container.register(ChatViewModelToken, scoped((c) => new ChatViewModel({ chatModel: c.resolve(ChatModelToken) })));
  render(
    <ViewModelProvider container={container.createScope('view')}>
      <ChatSessionsView onOpenTab={onOpenTab} />
    </ViewModelProvider>,
  );
  return { onOpenTab };
};

describe('ChatSessionsView', () => {
  it('세션을 나열하고 고르면 대화 탭을 연다', async () => {
    const { onOpenTab } = await mount();
    fireEvent.click(await screen.findByText('첫 대화'));
    expect(onOpenTab).toHaveBeenCalledWith({ id: 'id1', kind: 'chat', title: '첫 대화' });
  });

  it('새 대화를 만들면 그 탭을 연다', async () => {
    const { onOpenTab } = await mount();
    await screen.findByText('첫 대화');
    fireEvent.click(screen.getByRole('button', { name: /새 대화/u }));
    await vi.waitFor(() => expect(onOpenTab).toHaveBeenCalledWith(expect.objectContaining({ kind: 'chat', title: '새 대화' })));
  });
});
