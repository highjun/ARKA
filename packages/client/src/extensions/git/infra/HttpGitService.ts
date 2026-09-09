import { apiHeaders } from '#core/http';
import { GitCommitResponse, GitDiffResponse, GitErrorBody, GitStatusResponse } from '#contracts';
import type { IGitService } from '../model/IGitService';

/** `/api/git/*`를 읽고 쓰는 구현. 응답은 계약 스키마로 검증하고, 실패는 서버 사유를 담아 던진다. */
class HttpGitServiceAdapter implements IGitService {
  static readonly #TIMEOUT_MS = 30_000;

  async status() {
    return GitStatusResponse.parse(await this.#json('/api/git/status', { method: 'GET' }));
  }

  async diff(path: string, staged: boolean): Promise<string> {
    const params = new URLSearchParams({ path, staged: String(staged) });
    return GitDiffResponse.parse(await this.#json(`/api/git/diff?${params.toString()}`, { method: 'GET' })).diff;
  }

  async stage(paths: readonly string[]): Promise<void> {
    await this.#json('/api/git/stage', { method: 'POST', body: { paths } });
  }

  async unstage(paths: readonly string[]): Promise<void> {
    await this.#json('/api/git/unstage', { method: 'POST', body: { paths } });
  }

  async commit(message: string): Promise<string> {
    return GitCommitResponse.parse(await this.#json('/api/git/commit', { method: 'POST', body: { message } })).hash;
  }

  async #json(url: string, { method, body }: { method: string; body?: unknown }): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { ...apiHeaders(), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(HttpGitServiceAdapter.#TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof DOMException) throw new Error('응답이 없다 — 연결을 확인해 주세요.', { cause: error });
      throw error;
    }
    if (!response.ok) throw new Error(`git 요청이 실패했다 (${String(response.status)}${await this.#reasonOf(response)}).`);
    if (response.status === 204) return null;
    return response.json();
  }

  async #reasonOf(response: Response): Promise<string> {
    try {
      const body = GitErrorBody.safeParse(await response.json());
      return body.success ? `: ${body.data.message}` : '';
    } catch {
      return '';
    }
  }
}

/** `IGitService`의 실제 구현을 만든다. */
export const createGitServicePort = (): IGitService => new HttpGitServiceAdapter();
