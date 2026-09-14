import type { AgentEvent } from '#contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyChat, foldEvent } from './transcript';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
let seq = 0;
const ev = (partial: DistributiveOmit<AgentEvent, 'seq' | 'sessionId' | 'at'>): AgentEvent => ({ ...partial, seq: ++seq, sessionId: 's', at: seq } as AgentEvent);
const fold = (...events: AgentEvent[]) => events.reduce(foldEvent, emptyChat('s'));

describe('foldEvent', () => {
  beforeEach(() => {
    seq = 0;
  });

  it('run.started는 사용자 메시지가 되고 Run이 돈다', () => {
    const chat = fold(ev({ runId: 'r', type: 'run.started', mode: 'action', input: '안녕' }));
    expect(chat.items).toEqual([{ kind: 'user', id: 'run:r', text: '안녕', at: 1 }]);
    expect(chat).toMatchObject({ runStatus: 'running', activeRunId: 'r', lastSeq: 1 });
  });

  it('assistant 조각은 같은 messageId에 이어 붙고 done으로 닫힌다', () => {
    const chat = fold(
      ev({ runId: 'r', type: 'assistant.delta', messageId: 'm', text: '안' }),
      ev({ runId: 'r', type: 'assistant.delta', messageId: 'm', text: '녕' }),
      ev({ runId: 'r', type: 'assistant.done', messageId: 'm' }),
    );
    expect(chat.items).toEqual([{ kind: 'assistant', id: 'm', text: '안녕', done: true, at: 1 }]);
  });

  it('생각 조각도 같은 blockId에 이어 붙는다', () => {
    const chat = fold(ev({ runId: 'r', type: 'thinking.delta', blockId: 'b', text: 'a' }), ev({ runId: 'r', type: 'thinking.delta', blockId: 'b', text: 'b' }), ev({ runId: 'r', type: 'thinking.done', blockId: 'b' }));
    expect(chat.items).toEqual([{ kind: 'thinking', id: 'b', text: 'ab', done: true, at: 1 }]);
  });

  it('툴 호출은 결과가 오면 채워진다', () => {
    const chat = fold(ev({ runId: 'r', type: 'tool.call', callId: 'c', toolId: 'echo', input: { x: 1 } }), ev({ runId: 'r', type: 'tool.result', callId: 'c', output: { y: 2 }, isError: false }));
    expect(chat.items[0]).toMatchObject({ kind: 'tool', toolId: 'echo', input: { x: 1 }, output: { y: 2 }, done: true });
  });

  it('입력 요청은 대기 상태를 만들고, 답이 오면 사용자 메시지로 남고 대기가 풀린다', () => {
    const asked = fold(ev({ runId: 'r', type: 'run.started', mode: 'action', input: 'q?' }), ev({ runId: 'r', type: 'input.requested', requestId: 'q', prompt: '이름?' }));
    expect(asked).toMatchObject({ runStatus: 'waitingInput', pendingInput: { runId: 'r', requestId: 'q', prompt: '이름?' } });
    const answered = foldEvent(asked, ev({ runId: 'r', type: 'input.provided', requestId: 'q', text: '준' }));
    expect(answered.pendingInput).toBeNull();
    expect(answered.runStatus).toBe('running');
    expect(answered.items.at(-1)).toMatchObject({ kind: 'user', text: '준' });
  });

  it('run.finished는 Run을 닫는다', () => {
    const chat = fold(ev({ runId: 'r', type: 'run.started', mode: 'action', input: 'x' }), ev({ runId: 'r', type: 'run.finished', status: 'done' }));
    expect(chat).toMatchObject({ runStatus: 'done', activeRunId: null });
  });

  it('run.error는 오류 항목이 된다', () => {
    const chat = fold(ev({ runId: 'r', type: 'run.error', message: 'boom' }));
    expect(chat.items[0]).toMatchObject({ kind: 'error', message: 'boom' });
  });

  it('이미 본 seq는 무시한다 — 조각이 두 번 붙지 않는다', () => {
    const delta = ev({ runId: 'r', type: 'assistant.delta', messageId: 'm', text: '안' });
    const chat = foldEvent(foldEvent(emptyChat('s'), delta), delta);
    expect(chat.items[0]).toMatchObject({ text: '안' });
  });

  it('세션 수준 이벤트는 대화를 바꾸지 않고 seq만 올린다', () => {
    const chat = fold(ev({ runId: null, type: 'session.renamed', title: 't' }));
    expect(chat.items).toEqual([]);
    expect(chat.lastSeq).toBe(seq);
  });
});
