import { useViewModel } from '#core/view-model';
import { Banner, Button } from '@primer/react';
import { Text } from '#components/common';
import type { ReactNode } from 'react';
import { ChatRoom, InputComposer, Message, StepBlock } from '../component';
import type { TranscriptItem } from '../model/IChatModel';
import { ChatViewModelToken } from '../viewmodel/IChatViewModel';
import styles from './ChatTabView.module.css';

/**
 * 대화 탭. 어느 세션인지는 **props로 받는다** — 탭 하나가 세션 하나이고, 어느 탭이 열려 있는지는
 * Shell이 안다. `openSession`은 멱등이라 렌더마다 부른다(`FileContentView`의 `openFile`과 같은 관례).
 */
export const ChatTabView = ({ sessionId }: { readonly sessionId: string }) => {
  const viewModel = useViewModel(ChatViewModelToken);
  viewModel.openSession(sessionId);
  const chat = viewModel.chatOf(sessionId);

  const composer = (
    <InputComposer
      value={chat.composer.value}
      onValueChange={(value) => viewModel.setDraft(sessionId, value)}
      onSubmitValue={() => viewModel.submit(sessionId)}
      mode={chat.composer.mode}
      onModeChange={(mode) => viewModel.setMode(sessionId, mode)}
      loading={chat.composer.sending}
      placeholder={chat.composer.placeholder}
      submitOnEnter
    />
  );

  return (
    <div className={styles['root']} data-component="ChatTabView">
      {chat.failure === null ? null : <Banner variant="critical" title={chat.failure} layout="compact" />}
      {chat.reconnecting ? <Banner variant="warning" title="연결이 끊겨 다시 붙는 중이다" layout="compact" /> : null}
      <ChatRoom
        className={styles['room']}
        title="대화"
        status={chat.status ?? 'done'}
        composer={composer}
        emptyLabel="아직 메시지가 없다 — 아래에 적어 보내세요."
        actions={
          chat.canCancel ? (
            <Button size="small" variant="danger" onClick={() => viewModel.cancel(sessionId)}>
              중지
            </Button>
          ) : (
            <span />
          )
        }
      >
        {chat.items.length === 0 ? null : chat.items.map(renderItem)}
      </ChatRoom>
    </div>
  );
};

/** 투영 항목 하나를 컴포넌트로. ViewModel은 `ReactNode`를 갖지 않으므로 이 변환은 View의 몫이다. */
const renderItem = (item: TranscriptItem): ReactNode => {
  switch (item.kind) {
    case 'user':
      return (
        <Message key={item.id} role="user" timestamp={item.at}>
          {item.text}
        </Message>
      );
    case 'assistant':
      return (
        <Message key={item.id} role="agent" timestamp={item.at}>
          {item.text}
          {item.done ? null : <span aria-label="응답 중" className={styles['cursor']} />}
        </Message>
      );
    case 'thinking':
      return <StepBlock key={item.id} kind="thinking" status={item.done ? 'done' : 'running'} summary={item.text} />;
    case 'tool':
      return <StepBlock key={item.id} kind="tool" status={item.done ? (item.isError ? 'error' : 'done') : 'running'} toolId={item.toolId} toolInput={item.input} toolOutput={item.output} />;
    case 'error':
      return (
        <Message key={item.id} role="system" timestamp={item.at}>
          <Text tone="danger">{item.message}</Text>
        </Message>
      );
  }
};
