import { createWorkspaceFilesPort } from './HttpWorkspaceFiles';

/**
 * 계약을 네트워크 경계에서 검사한다 — 손으로 갈아끼우는 것은 `fetch` 하나뿐이고, Adapter 의
 * 이름은 이 파일 어디에도 나오지 않는다. 구현을 바꿔도 이 테스트는 그대로 남아야 한다.
 */

const originalFetch = globalThis.fetch;

type Call = { readonly url: string; readonly method: string; readonly headers: Record<string, string>; readonly body: string | undefined };

const serverReplies = (body: unknown, status = 200): { calls: readonly Call[] } => {
  const calls: Call[] = [];
  globalThis.fetch = ((input: unknown, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET', headers: init?.headers ?? {}, body: init?.body });
    return Promise.resolve({
      ok: status < 400,
      status,
      json: () => Promise.resolve(body),
    });
  }) as unknown as typeof fetch;
  return { calls };
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const LISTING = {
  path: 'projects',
  parent: '',
  entries: [{ name: 'dev-kit', type: 'dir' }],
};

describe('list', () => {
  it('서버가 보낸 디렉터리 목록을 그대로 돌려준다', async () => {
    serverReplies(LISTING);
    expect(await createWorkspaceFilesPort().list('projects')).toEqual(LISTING);
  });

  it('경로를 path segment 가 아니라 query parameter 로 실어 보낸다', async () => {
    const { calls } = serverReplies(LISTING);
    await createWorkspaceFilesPort().list('projects/dev-kit');
    expect(calls[0]?.url).toBe('/api/files?path=projects%2Fdev-kit');
  });

  it('요청을 바꿔버릴 수 있는 경로는 인코딩한다', async () => {
    const { calls } = serverReplies(LISTING);
    await createWorkspaceFilesPort().list('노트 & 자료#1');
    expect(calls[0]?.url).toBe('/api/files?path=%EB%85%B8%ED%8A%B8+%26+%EC%9E%90%EB%A3%8C%231');
  });

  it('빈 경로로 루트를 요청한다', async () => {
    const { calls } = serverReplies(LISTING);
    await createWorkspaceFilesPort().list('');
    expect(calls[0]?.url).toBe('/api/files?path=');
  });
});

describe('read', () => {
  it('서버가 보낸 파일 내용을 그대로 돌려준다', async () => {
    const content = { path: 'a.md', content: '# hi\n', truncated: false, encoding: 'utf8' };
    serverReplies(content);
    expect(await createWorkspaceFilesPort().read('a.md')).toEqual(content);
  });

  it('content 엔드포인트를 사용한다', async () => {
    const { calls } = serverReplies({ path: 'a.md', content: '', truncated: false, encoding: 'utf8' });
    await createWorkspaceFilesPort().read('a.md');
    expect(calls[0]?.url).toBe('/api/files/content?path=a.md');
  });

  it('응답이 계약에 어긋나면 던진다 — 서버가 모양을 바꾼 것을 전송 경계에서 잡는다', async () => {
    serverReplies({ path: 'a.md', content: 42 });
    await expect(createWorkspaceFilesPort().read('a.md')).rejects.toThrow();
  });

  it('계약에 없는 필드는 버린다', async () => {
    serverReplies({ path: 'a.md', content: '', truncated: false, encoding: 'utf8', size: 3 });
    expect(await createWorkspaceFilesPort().read('a.md')).not.toHaveProperty('size');
  });
});

describe('write', () => {
  it('PUT 으로 경로와 내용을 본문에 싣는다 — 경로는 그대로, URL 인코딩하지 않는다', async () => {
    const { calls } = serverReplies({});
    await createWorkspaceFilesPort().write('a.md', '# hi\n');

    expect(calls[0]?.url).toBe('/api/files/content');
    expect(calls[0]?.method).toBe('PUT');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ path: 'a.md', content: '# hi\n' });
  });

  it('JSON 본문을 알린다', async () => {
    const { calls } = serverReplies({});
    await createWorkspaceFilesPort().write('a.md', 'x');
    expect(calls[0]?.headers['content-type']).toBe('application/json');
  });

  it('실패하면 상태와 사유를 담아 던진다', async () => {
    serverReplies({ code: 'NoPermission', message: '이 배포는 읽기 전용이다 — 저장할 수 없다.' }, 403);
    await expect(createWorkspaceFilesPort().write('a.md', 'x')).rejects.toThrow(/403.*읽기 전용/u);
  });
});

describe('create', () => {
  it('POST 로 경로와 종류를 본문에 싣는다', async () => {
    const { calls } = serverReplies({});
    await createWorkspaceFilesPort().create('a.md', 'file');

    expect(calls[0]?.url).toBe('/api/files');
    expect(calls[0]?.method).toBe('POST');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ path: 'a.md', type: 'file' });
  });

  it('실패하면 상태와 사유를 담아 던진다', async () => {
    serverReplies({ code: 'Exists', message: 'already exists' }, 409);
    await expect(createWorkspaceFilesPort().create('a.md', 'file')).rejects.toThrow(/409.*already exists/u);
  });
});

describe('move', () => {
  it('POST 로 출발지와 목적지를 본문에 싣는다', async () => {
    const { calls } = serverReplies({});
    await createWorkspaceFilesPort().move('a.md', 'b.md');

    expect(calls[0]?.url).toBe('/api/files/move');
    expect(calls[0]?.method).toBe('POST');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ from: 'a.md', to: 'b.md' });
  });

  it('실패하면 상태와 사유를 담아 던진다', async () => {
    serverReplies({ code: 'Exists', message: 'already exists' }, 409);
    await expect(createWorkspaceFilesPort().move('a.md', 'b.md')).rejects.toThrow(/409.*already exists/u);
  });
});

describe('remove', () => {
  it('DELETE 로 경로를 쿼리로 싣는다', async () => {
    const { calls } = serverReplies({});
    await createWorkspaceFilesPort().remove('a.md');

    expect(calls[0]?.url).toBe('/api/files?path=a.md');
    expect(calls[0]?.method).toBe('DELETE');
  });

  it('실패하면 상태와 사유를 담아 던진다', async () => {
    serverReplies({ code: 'NoPermission', message: 'forbidden' }, 403);
    await expect(createWorkspaceFilesPort().remove('a.md')).rejects.toThrow(/403.*forbidden/u);
  });
});

describe('failure', () => {
  it('서버가 준 status 와 reason 을 담아 던진다', async () => {
    serverReplies({ code: 'NoPermission', message: 'forbidden' }, 403);
    await expect(createWorkspaceFilesPort().list('../etc')).rejects.toThrow(/403.*forbidden/u);
  });

  it('본문에 reason 이 없어도 던진다', async () => {
    serverReplies(null, 500);
    await expect(createWorkspaceFilesPort().read('a.md')).rejects.toThrow(/500/u);
  });
});

describe('프로토콜 헤더', () => {
  it('모든 요청에 x-ade-protocol을 싣는다 — 서버가 낡은 클라이언트를 가려내는 근거다', async () => {
    const { calls } = serverReplies(LISTING);
    await createWorkspaceFilesPort().list('');
    expect(calls[0]?.headers['x-ade-protocol']).toBe('1');
  });

  it('인증 헤더는 없다 — 앱은 인증을 모른다', async () => {
    const { calls } = serverReplies(LISTING);
    await createWorkspaceFilesPort().list('');
    expect(calls[0]?.headers['authorization']).toBeUndefined();
  });
});
