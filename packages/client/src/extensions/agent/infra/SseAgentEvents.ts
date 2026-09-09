import { apiHeaders, readSse, sleep } from '#core/http';
import { AgentEvent, type SessionId } from '#contracts';
import type { IAgentEvents } from '../model/IAgentEvents';

/** 끊기면 이만큼 쉬고 다시 붙는다. */
const RETRY_MS = 2_000;

/**
 * `/api/agent/sessions/:id/events` SSE를 읽는 구현. 끊기면 마지막 `seq`부터 이어 받는다 — 같은
 * 이벤트를 두 번 주지 않는 것은 서버의 `since`와 여기의 `last` 둘이 함께 보장한다.
 */
class SseAgentEventsAdapter implements IAgentEvents {
  subscribe(sessionId: SessionId, since: number, onEvent: (event: AgentEvent) => void): () => void {
    const controller = new AbortController();
    void this.#loop(sessionId, since, onEvent, controller.signal);
    return () => controller.abort();
  }

  async #loop(sessionId: SessionId, since: number, onEvent: (event: AgentEvent) => void, signal: AbortSignal): Promise<void> {
    let last = since;
    while (!signal.aborted) {
      try {
        await readSse(`/api/agent/sessions/${encodeURIComponent(sessionId)}/events?since=${String(last)}`, { headers: apiHeaders(), signal }, (data) => {
          const parsed = AgentEvent.safeParse(JSON.parse(data));
          // 모르는 type은 버린다 — 옛 클라이언트가 새 서버의 이벤트를 만나도 죽지 않는다.
          if (!parsed.success || parsed.data.seq <= last) return;
          last = parsed.data.seq;
          onEvent(parsed.data);
        });
      } catch {
        // 연결 실패거나 중간에 끊겼다 — 해지된 게 아니면 아래서 다시 시도한다.
      }
      if (signal.aborted) return;
      await sleep(RETRY_MS, signal);
    }
  }
}

/** `IAgentEvents`의 실제 구현을 만든다. */
export const createAgentEventsPort = (): IAgentEvents => new SseAgentEventsAdapter();
