import { apiHeaders } from '#core/http';
import { AgentErrorBody, RunResponse, SessionListResponse, SessionResponse } from '#contracts';
import type { AgentSession, IAgentApi, RunMode, SessionId } from '../model/IAgentApi';

/**
 * `/api/agent/*`를 읽고 쓰는 구현. 응답은 `contracts` 스키마로 검증한다(→ `HttpWorkspaceFiles`와 같은 이유).
 * 실패는 서버가 준 사유를 담아 던진다.
 */
class HttpAgentApiAdapter implements IAgentApi {
  static readonly #TIMEOUT_MS = 10_000;

  async listSessions(): Promise<readonly AgentSession[]> {
    return SessionListResponse.parse(await this.#json('/api/agent/sessions', { method: 'GET' })).sessions;
  }

  async createSession(title?: string): Promise<AgentSession> {
    return SessionResponse.parse(await this.#json('/api/agent/sessions', { method: 'POST', body: title === undefined ? {} : { title } })).session;
  }

  async updateSession(id: SessionId, patch: { readonly title?: string; readonly archived?: boolean }): Promise<AgentSession> {
    return SessionResponse.parse(await this.#json(`/api/agent/sessions/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })).session;
  }

  async startRun(sessionId: SessionId, input: string, mode: RunMode, { confirmWrites = true }: { readonly confirmWrites?: boolean } = {}) {
    return RunResponse.parse(await this.#json(`/api/agent/sessions/${encodeURIComponent(sessionId)}/runs`, { method: 'POST', body: { input, mode, confirmWrites } }));
  }

  async provideInput(sessionId: SessionId, runId: string, requestId: string, text: string): Promise<void> {
    await this.#json(`/api/agent/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}/input`, { method: 'POST', body: { requestId, text } });
  }

  async cancelRun(sessionId: SessionId, runId: string): Promise<void> {
    await this.#json(`/api/agent/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' });
  }

  /** 요청을 보내고 JSON을 돌려준다. 204면 `null`. 실패면 서버 사유를 담아 던진다. */
  async #json(url: string, { method, body }: { method: string; body?: unknown }): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { ...apiHeaders(), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(HttpAgentApiAdapter.#TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof DOMException) throw new Error('응답이 없다 — 연결을 확인해 주세요.', { cause: error });
      throw error;
    }
    if (!response.ok) throw new Error(`요청이 실패했다 (${String(response.status)}${await this.#reasonOf(response)}).`);
    if (response.status === 204) return null;
    return response.json();
  }

  async #reasonOf(response: Response): Promise<string> {
    try {
      const body = AgentErrorBody.safeParse(await response.json());
      return body.success ? `: ${body.data.message}` : '';
    } catch {
      return '';
    }
  }
}

/** `IAgentApi`의 실제 구현을 만든다. */
export const createAgentApiPort = (): IAgentApi => new HttpAgentApiAdapter();
