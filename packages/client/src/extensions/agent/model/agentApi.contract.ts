import type { AgentEvent } from 'contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import type { IAgentApi } from './IAgentApi';
import type { IAgentEvents } from './IAgentEvents';

type Backend = IAgentApi & IAgentEvents;

/** 이벤트가 `count`개 모일 때까지(또는 `until`이 참일 때까지) 기다린다. */
const collect = (events: IAgentEvents, sessionId: string, until: (events: AgentEvent[]) => boolean, timeoutMs = 3_000): Promise<AgentEvent[]> =>
  new Promise((resolve, reject) => {
    const got: AgentEvent[] = [];
    // subscribe가 밀린 이벤트를 동기로 되돌려 줄 수 있어, 해지 함수는 대입되기 전에 필요할 수 있다.
    let unsubscribe: () => void = () => undefined;
    let settled = false;
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`timeout; got ${got.map((e) => e.type).join(',')}`));
    }, timeoutMs);
    unsubscribe = events.subscribe(sessionId, 0, (event) => {
      if (settled) return;
      got.push(event);
      if (until(got)) {
        settled = true;
        clearTimeout(timer);
        // 구독 콜백 안에서 해지하면 재연결 루프가 꼬일 수 있어 다음 틱에 끊는다.
        setTimeout(() => unsubscribe(), 0);
        resolve(got);
      }
    });
  });

const finished = (events: AgentEvent[]) => events.some((e) => e.type === 'run.finished');

/**
 * `IAgentApi` + `IAgentEvents`를 구현한 모든 것이 통과해야 하는 스위트 — Mock과 실제 서버(test/contract) 둘 다.
 * `setup`은 빈 백엔드를 새로 준다.
 */
export const testAgentApiContract = (name: string, setup: () => Backend | Promise<Backend>): void => {
  describe(`IAgentApi: ${name}`, () => {
    let backend: Backend;
    beforeEach(async () => {
      backend = await setup();
    });

    it('만든 세션이 목록에 있고 제목·보관을 바꿀 수 있다', async () => {
      const created = await backend.createSession('첫');
      expect(created).toMatchObject({ title: '첫', archived: false, lastRunStatus: null });
      expect((await backend.listSessions()).map((s) => s.id)).toEqual([created.id]);
      const updated = await backend.updateSession(created.id, { title: '둘', archived: true });
      expect(updated).toMatchObject({ id: created.id, title: '둘', archived: true });
    });

    it('없는 세션은 던진다', async () => {
      await expect(backend.updateSession('nope', { title: 'x' })).rejects.toThrow();
      await expect(backend.startRun('nope', 'x', 'action')).rejects.toThrow();
    });

    it('Run을 시작하면 run.started로 시작해 run.finished로 끝나는 이벤트가 흐르고 답변이 있다', async () => {
      const session = await backend.createSession();
      const response = await backend.startRun(session.id, '안녕', 'action');
      expect(response.runId).not.toBe('');
      const events = await collect(backend, session.id, finished);
      const types = events.map((e) => e.type);
      expect(types[0]).toBe('session.renamed'); // 제목이 비어 있었으니 첫 입력이 제목이 된다
      expect(types).toContain('run.started');
      expect(types).toContain('assistant.done');
      expect(events.at(-1)).toMatchObject({ type: 'run.finished', status: 'done' });
      expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i + 1));
      expect((await backend.listSessions())[0]).toMatchObject({ title: '안녕', lastRunStatus: 'done' });
    });

    it('since로 이어 받으면 이미 본 seq는 오지 않는다', async () => {
      const session = await backend.createSession('t');
      await backend.startRun(session.id, 'x', 'action');
      const all = await collect(backend, session.id, finished);
      const later = await new Promise<AgentEvent[]>((resolve) => {
        const got: AgentEvent[] = [];
        let unsubscribe: () => void = () => undefined;
        unsubscribe = backend.subscribe(session.id, all.length - 1, (event) => {
          got.push(event);
          setTimeout(() => {
            unsubscribe();
            resolve(got);
          }, 0);
        });
      });
      expect(later.map((e) => e.seq)).toEqual([all.length]);
    });

    it('입력을 물으면 waitingInput이 되고 답을 주면 끝난다', async () => {
      const session = await backend.createSession('t');
      const { runId } = await backend.startRun(session.id, '이게 뭐야?', 'action');
      const asked = await collect(backend, session.id, (events) => events.some((e) => e.type === 'input.requested'));
      const request = asked.find((e) => e.type === 'input.requested');
      const requestId = request !== undefined && 'requestId' in request ? request.requestId : '';
      await expect(backend.provideInput(session.id, runId, 'wrong', 'x')).rejects.toThrow();
      await backend.provideInput(session.id, runId, requestId, '준');
      const events = await collect(backend, session.id, finished);
      expect(events.some((e) => e.type === 'input.provided')).toBe(true);
      expect(events.at(-1)).toMatchObject({ type: 'run.finished', status: 'done' });
    });

    it('도는 Run이 없는데 끊으면 던진다', async () => {
      const session = await backend.createSession('t');
      await expect(backend.cancelRun(session.id, 'nope')).rejects.toThrow();
    });
  });
};
