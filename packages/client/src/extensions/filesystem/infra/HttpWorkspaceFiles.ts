import { DirectoryListing, FileContent, FileErrorBody } from 'contracts';
import type { FileEntryType, IWorkspaceFiles } from '../model/IWorkspaceFiles';

/**
 * 세션 서버(`server/files.ts`)의 파일 API 를 읽는 구현.
 *
 * 경로가 상대(`/api/files`)인 것은 개발에서는 vite 프록시가, 배포에서는 같은 서버가 한 오리진으로
 * 묶어 주기 때문이다 — 클라이언트가 서버 주소를 알면 배포 형태가 코드에 새어든다.
 *
 * 경로를 `URLSearchParams` 로 싣는다. 경로 세그먼트에 붙이면 슬래시·한글·`#` 을 우리가 직접
 * 인코딩해야 하고, 한 군데만 빠뜨려도 조용히 다른 파일을 연다.
 *
 * 응답은 `contracts`의 스키마로 검증한다 — `as T`로 믿어 버리면 서버가 모양을 바꿨을 때
 * 화면 깊숙한 곳에서 `undefined`로 터진다. 여기서 던지면 원인이 전송 경계에 있다고 바로 드러난다.
 */

class HttpWorkspaceFilesAdapter implements IWorkspaceFiles {
  /**
   * 응답을 기다리는 한도.
   *
   * 없으면 서버가 안 답할 때 요청이 영원히 매달리고, 화면은 **무한 대기와 빈 폴더를 구분하지
   * 못한다.** 폰에서 터널을 오가는 왕복이 0.5초쯤이라 10초면 넉넉히 느린 쪽까지 덮는다.
   */
  static readonly #TIMEOUT_MS = 10_000;

  async list(path: string): Promise<DirectoryListing> {
    return DirectoryListing.parse(await this.#get('/api/files', path));
  }

  async read(path: string): Promise<FileContent> {
    return FileContent.parse(await this.#get('/api/files/content', path));
  }

  async write(path: string, content: string): Promise<void> {
    const response = await this.#fetch('/api/files/content', {
      method: 'PUT',
      headers: { ...this.#headers(), 'content-type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`저장하지 못했다 (${String(response.status)}${reason}).`);
    }
  }

  async create(path: string, type: FileEntryType): Promise<void> {
    const response = await this.#fetch('/api/files', {
      method: 'POST',
      headers: { ...this.#headers(), 'content-type': 'application/json' },
      body: JSON.stringify({ path, type }),
    });
    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`만들지 못했다 (${String(response.status)}${reason}).`);
    }
  }

  async move(from: string, to: string): Promise<void> {
    const response = await this.#fetch('/api/files/move', {
      method: 'POST',
      headers: { ...this.#headers(), 'content-type': 'application/json' },
      body: JSON.stringify({ from, to }),
    });
    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`옮기지 못했다 (${String(response.status)}${reason}).`);
    }
  }

  async remove(path: string): Promise<void> {
    const response = await this.#fetch(`/api/files?${new URLSearchParams({ path }).toString()}`, {
      method: 'DELETE',
      headers: this.#headers(),
    });
    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`지우지 못했다 (${String(response.status)}${reason}).`);
    }
  }

  async #get(endpoint: string, path: string): Promise<unknown> {
    const response = await this.#fetch(`${endpoint}?${new URLSearchParams({ path }).toString()}`, {
      headers: this.#headers(),
    });

    // 서버가 사유를 JSON 으로 준다. 못 읽어도 상태 코드만으로 말이 되게 둔다.
    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`파일을 읽지 못했다 (${String(response.status)}${reason}).`);
    }
    return response.json();
  }

  /** GET·PUT 이 공유하는 것 — 타임아웃과 "응답이 없다" 로의 번역. 상태 코드 판정은 호출부의 몫이다. */
  async #fetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(HttpWorkspaceFilesAdapter.#TIMEOUT_MS) });
    } catch (error) {
      // 중단은 브라우저마다 이름이 갈린다(`TimeoutError`·`AbortError`) — 사람이 읽을 말로 바꾼다.
      if (error instanceof DOMException) throw new Error('응답이 없다 — 연결을 확인해 주세요.', { cause: error });
      throw error;
    }
  }

  async #reasonOf(response: Response): Promise<string> {
    try {
      const body = FileErrorBody.safeParse(await response.json());
      return body.success ? `: ${body.data.message}` : '';
    } catch {
      return '';
    }
  }

  #headers(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('workbench.token');
    if (token !== null && token !== '') headers['authorization'] = `Bearer ${token}`;
    return headers;
  }
}

/** `IWorkspaceFiles`의 실제 구현(`HttpWorkspaceFilesAdapter`)을 만든다. */
export const createWorkspaceFilesPort = (): IWorkspaceFiles => new HttpWorkspaceFilesAdapter();
