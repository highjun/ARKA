import type { AgentEvent, SessionId } from 'contracts';
import type { SessionChat, TranscriptItem } from './IChatModel';

/** 아직 아무것도 받지 않은 대화. */
export const emptyChat = (sessionId: SessionId): SessionChat => ({
  sessionId,
  items: [],
  runStatus: null,
  activeRunId: null,
  pendingInput: null,
  lastSeq: 0,
  connection: 'idle',
  failure: null,
});

/** 같은 `id`의 항목을 바꾼다. 없으면 그대로 — 조각이 순서를 잃어도 죽지 않게. */
const replace = (items: readonly TranscriptItem[], id: string, update: (item: TranscriptItem) => TranscriptItem): readonly TranscriptItem[] =>
  items.map((item) => (item.id === id ? update(item) : item));

/**
 * 이벤트 하나를 대화에 접는다 — 순수 함수라 여기가 Model 테스트의 중심이다(→ ADR 0008).
 *
 * 이미 본 `seq`는 무시한다. 재연결이 `since=lastSeq`로 이어 받으므로 겹칠 일은 드물지만,
 * 겹치면 조각이 두 번 붙어 글자가 중복된다.
 */
export const foldEvent = (chat: SessionChat, event: AgentEvent): SessionChat => {
  if (event.seq <= chat.lastSeq) return chat;
  const base = { ...chat, lastSeq: event.seq };
  const { items } = chat;

  switch (event.type) {
    case 'run.started':
      return {
        ...base,
        items: [...items, { kind: 'user', id: `run:${event.runId}`, text: event.input, at: event.at }],
        runStatus: 'running',
        activeRunId: event.runId,
        pendingInput: null,
      };
    case 'run.finished':
      return { ...base, runStatus: event.status, activeRunId: null, pendingInput: null };
    case 'assistant.delta':
      return {
        ...base,
        items: items.some((item) => item.id === event.messageId)
          ? replace(items, event.messageId, (item) => (item.kind === 'assistant' ? { ...item, text: item.text + event.text } : item))
          : [...items, { kind: 'assistant', id: event.messageId, text: event.text, done: false, at: event.at }],
      };
    case 'assistant.done':
      return { ...base, items: replace(items, event.messageId, (item) => (item.kind === 'assistant' ? { ...item, done: true } : item)) };
    case 'thinking.delta':
      return {
        ...base,
        items: items.some((item) => item.id === event.blockId)
          ? replace(items, event.blockId, (item) => (item.kind === 'thinking' ? { ...item, text: item.text + event.text } : item))
          : [...items, { kind: 'thinking', id: event.blockId, text: event.text, done: false, at: event.at }],
      };
    case 'thinking.done':
      return { ...base, items: replace(items, event.blockId, (item) => (item.kind === 'thinking' ? { ...item, done: true } : item)) };
    case 'tool.call':
      return {
        ...base,
        items: [...items, { kind: 'tool', id: event.callId, toolId: event.toolId, input: event.input, output: undefined, isError: false, done: false, at: event.at }],
      };
    case 'tool.result':
      return {
        ...base,
        items: replace(items, event.callId, (item) => (item.kind === 'tool' ? { ...item, output: event.output, isError: event.isError, done: true } : item)),
      };
    case 'input.requested':
      return { ...base, runStatus: 'waitingInput', pendingInput: { runId: event.runId, requestId: event.requestId, prompt: event.prompt } };
    case 'input.provided':
      return {
        ...base,
        items: [...items, { kind: 'user', id: `input:${event.requestId}`, text: event.text, at: event.at }],
        runStatus: 'running',
        pendingInput: null,
      };
    case 'run.error':
      return { ...base, items: [...items, { kind: 'error', id: `error:${String(event.seq)}`, message: event.message, at: event.at }] };
    case 'session.renamed':
    case 'session.archived':
      return base;
  }
};
