import { createWorkspaceWatchPort } from './HttpWorkspaceWatch';

/**
 * Port 에 바라는 것: **SSE 바이트를 "무엇이 바뀌었는지" 목록으로 바꾸고, 해지하면 더는 안 부른다.**
 * Adapter 이름은 여기 나오지 않는다 — 전송을 바꿔도 이 파일은 그대로 살아야 한다.
 *
 * `vi.mock` 을 쓰지 않는다(`port-integration-test-no-mock`) — 모듈을 갈아끼우는 대신
 * **네트워크 경계만** 대신한다.
 */
const encoder = new TextEncoder();

const streamOf = (chunks: readonly string[]): ReadableStream<Uint8Array> =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

const frame = (paths: readonly string[]): string => `data: ${JSON.stringify({ paths })}\n\n`;

const originalFetch = globalThis.fetch;

/** 서버가 이 바이트들을 보냈다고 치고, 마지막 요청 URL을 남겨 둔다. */
const serverSends = (chunks: readonly string[], status = 200): { url: () => string | null; calls: () => number } => {
  let captured: string | null = null;
  let calls = 0;
  globalThis.fetch = ((input: unknown) => {
    captured = String(input);
    calls += 1;
    return Promise.resolve({ ok: status < 400, status, body: streamOf(chunks) });
  }) as unknown as typeof fetch;
  return { url: () => captured, calls: () => calls };
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

/**
 * 스트림 소비가 끝날 때까지 기다린다 — 매크로태스크 한 바퀴(`setTimeout(0)`)를 쓴다.
 * 마이크로태스크만 세면(예전엔 `Promise.resolve()` 두 번) `#readWithIdleTimeout`(idle-timeout
 * 경쟁을 위한 `Promise.race`)이 추가한 체인 깊이에 맞춰 셀 때마다 다시 맞춰야 해서 깨지기
 * 쉽다 — 매크로태스크 한 바퀴는 그 안의 마이크로태스크를 전부 비우므로 체인 깊이와 무관하다.
 */
const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

it('SSE 프레임을 바뀐 경로 목록으로 바꾼다', async () => {
  serverSends([frame(['a.md']), frame(['b.md', 'c.md'])]);
  const changes: (readonly string[])[] = [];

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md', 'b.md'], (changed) => changes.push(changed));
  await flush();
  unsubscribe();

  expect(changes).toEqual([['a.md'], ['b.md', 'c.md']]);
});

it('나뉘어 도착한 프레임도 합쳐 읽는다', async () => {
  const whole = frame(['a.md']);
  serverSends([whole.slice(0, 9), whole.slice(9)]);
  const changes: (readonly string[])[] = [];

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md'], (changed) => changes.push(changed));
  await flush();
  unsubscribe();

  expect(changes).toEqual([['a.md']]);
});

it('깨진 프레임은 건너뛰고 나머지는 그대로 읽는다', async () => {
  serverSends(['data: {부서진\n\n', frame(['a.md'])]);
  const changes: (readonly string[])[] = [];

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md'], (changed) => changes.push(changed));
  await flush();
  unsubscribe();

  expect(changes).toEqual([['a.md']]);
});

it('paths 를 복수의 path 쿼리 파라미터로 보낸다', async () => {
  const server = serverSends([frame([])]);

  const unsubscribe = createWorkspaceWatchPort().watch(['a', 'b/c'], () => undefined);
  await flush();
  unsubscribe();

  const url = new URL(server.url() ?? '', 'http://localhost');
  expect(url.searchParams.getAll('path')).toEqual(['a', 'b/c']);
});

it('빈 경로로 부르면 연결하지 않는다', () => {
  const server = serverSends([]);

  const unsubscribe = createWorkspaceWatchPort().watch([], () => undefined);
  unsubscribe();

  expect(server.calls()).toBe(0);
});

it('해지하면 재시도 대기 중이어도 더는 연결하지 않는다', async () => {
  vi.useFakeTimers();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return Promise.reject(new Error('연결 끊김'));
  }) as unknown as typeof fetch;

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md'], () => undefined);
  // 첫 연결이 실패로 이어지기 전에 해지한다.
  unsubscribe();
  await vi.advanceTimersByTimeAsync(5_000);

  expect(calls).toBe(1);
});

it('해지하지 않으면 연결이 끊긴 뒤 다시 붙는다', async () => {
  vi.useFakeTimers();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return Promise.reject(new Error('연결 끊김'));
  }) as unknown as typeof fetch;

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md'], () => undefined);
  await vi.advanceTimersByTimeAsync(3_000);
  unsubscribe();

  expect(calls).toBeGreaterThanOrEqual(2);
});

it('빈 paths(하트비트) 프레임은 onChange 를 안 부른다', async () => {
  serverSends([frame([]), frame(['a.md']), frame([])]);
  const changes: (readonly string[])[] = [];

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md'], (changed) => changes.push(changed));
  await flush();
  unsubscribe();

  expect(changes).toEqual([['a.md']]);
});

/** `pull`에서 아무것도 enqueue하지 않는 스트림 — `reader.read()`가 절대 안 끝난다(idle-timeout·
 *  visibility 테스트에서 "연결이 조용히 죽었다"를 흉내내는 자리). */
const neverRespondingStream = (): ReadableStream<Uint8Array> => new ReadableStream<Uint8Array>({ pull() {} });

it('idle-timeout 안에 아무 프레임도 안 오면 재연결한다', async () => {
  vi.useFakeTimers();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return Promise.resolve({ ok: true, status: 200, body: neverRespondingStream() });
  }) as unknown as typeof fetch;

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md'], () => undefined);
  await vi.advanceTimersByTimeAsync(1);
  expect(calls).toBe(1);

  // idle-timeout(45s)을 넘기면 죽은 연결로 보고 재시도 대기(2s) 뒤 다시 연결해야 한다.
  await vi.advanceTimersByTimeAsync(45_000 + 2_000);
  unsubscribe();

  expect(calls).toBe(2);
});

it('하트비트가 idle-timeout 전에 도착하면 재연결하지 않는다', async () => {
  vi.useFakeTimers();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    // 15초마다 빈 프레임(하트비트)을 흘려보내는 스트림 — idle-timeout(45초)보다 훨씬 자주 온다.
    return Promise.resolve({
      ok: true,
      status: 200,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          setInterval(() => controller.enqueue(encoder.encode(frame([]))), 15_000);
        },
      }),
    });
  }) as unknown as typeof fetch;

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md'], () => undefined);
  await vi.advanceTimersByTimeAsync(60_000);
  unsubscribe();

  expect(calls).toBe(1);
});

it('visibilitychange(visible)가 오면 idle-timeout을 기다리지 않고 즉시 재연결한다', async () => {
  vi.useFakeTimers();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return Promise.resolve({ ok: true, status: 200, body: neverRespondingStream() });
  }) as unknown as typeof fetch;

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md'], () => undefined);
  await vi.advanceTimersByTimeAsync(1);
  expect(calls).toBe(1);

  document.dispatchEvent(new Event('visibilitychange'));
  // idle-timeout(45s)의 극히 일부인 재시도 대기(2s)만 지나도 재연결돼야 한다.
  await vi.advanceTimersByTimeAsync(2_000);
  unsubscribe();

  expect(calls).toBe(2);
});

it('해지하면 visibilitychange 를 쏴도 더는 재연결하지 않는다', async () => {
  vi.useFakeTimers();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return Promise.resolve({ ok: true, status: 200, body: neverRespondingStream() });
  }) as unknown as typeof fetch;

  const unsubscribe = createWorkspaceWatchPort().watch(['a.md'], () => undefined);
  await vi.advanceTimersByTimeAsync(1);
  unsubscribe();

  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(5_000);

  expect(calls).toBe(1);
});
