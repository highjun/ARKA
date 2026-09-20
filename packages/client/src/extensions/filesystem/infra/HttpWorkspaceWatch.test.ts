import { createWorkspaceWatchPort } from "./HttpWorkspaceWatch";

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

describe("HttpWorkspaceWatch", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  const flush = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  it("SSE 프레임을 바뀐 경로 목록으로 바꾼다", async () => {
    serverSends([frame(["a.md"]), frame(["b.md", "c.md"])]);
    const changes: (readonly string[])[] = [];

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md", "b.md"], (changed) => changes.push(changed));
    await flush();
    unsubscribe();

    expect(changes).toEqual([["a.md"], ["b.md", "c.md"]]);
  });

  it("나뉘어 도착한 프레임도 합쳐 읽는다", async () => {
    const whole = frame(["a.md"]);
    serverSends([whole.slice(0, 9), whole.slice(9)]);
    const changes: (readonly string[])[] = [];

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md"], (changed) => changes.push(changed));
    await flush();
    unsubscribe();

    expect(changes).toEqual([["a.md"]]);
  });

  it("깨진 프레임은 건너뛰고 나머지는 그대로 읽는다", async () => {
    serverSends(["data: {부서진\n\n", frame(["a.md"])]);
    const changes: (readonly string[])[] = [];

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md"], (changed) => changes.push(changed));
    await flush();
    unsubscribe();

    expect(changes).toEqual([["a.md"]]);
  });

  it("paths 를 복수의 path 쿼리 파라미터로 보낸다", async () => {
    const server = serverSends([frame([])]);

    const unsubscribe = createWorkspaceWatchPort().watch(["a", "b/c"], () => undefined);
    await flush();
    unsubscribe();

    const url = new URL(server.url() ?? "", "http://localhost");
    expect(url.searchParams.getAll("path")).toEqual(["a", "b/c"]);
  });

  it("빈 경로로 부르면 연결하지 않는다", () => {
    const server = serverSends([]);

    const unsubscribe = createWorkspaceWatchPort().watch([], () => undefined);
    unsubscribe();

    expect(server.calls()).toBe(0);
  });

  it("해지하면 재시도 대기 중이어도 더는 연결하지 않는다", async () => {
    vi.useFakeTimers();
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      return Promise.reject(new Error("연결 끊김"));
    }) as unknown as typeof fetch;

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md"], () => undefined);
    unsubscribe();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(calls).toBe(1);
  });

  it("해지하지 않으면 연결이 끊긴 뒤 다시 붙는다", async () => {
    vi.useFakeTimers();
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      return Promise.reject(new Error("연결 끊김"));
    }) as unknown as typeof fetch;

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md"], () => undefined);
    await vi.advanceTimersByTimeAsync(3_000);
    unsubscribe();

    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("빈 paths(하트비트) 프레임은 onChange 를 안 부른다", async () => {
    serverSends([frame([]), frame(["a.md"]), frame([])]);
    const changes: (readonly string[])[] = [];

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md"], (changed) => changes.push(changed));
    await flush();
    unsubscribe();

    expect(changes).toEqual([["a.md"]]);
  });

  const neverRespondingStream = (): ReadableStream<Uint8Array> => new ReadableStream<Uint8Array>({ pull() {} });

  it("idle-timeout 안에 아무 프레임도 안 오면 재연결한다", async () => {
    vi.useFakeTimers();
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      return Promise.resolve({ ok: true, status: 200, body: neverRespondingStream() });
    }) as unknown as typeof fetch;

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md"], () => undefined);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toBe(1);

    await vi.advanceTimersByTimeAsync(45_000 + 2_000);
    unsubscribe();

    expect(calls).toBe(2);
  });

  it("하트비트가 idle-timeout 전에 도착하면 재연결하지 않는다", async () => {
    vi.useFakeTimers();
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
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

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md"], () => undefined);
    await vi.advanceTimersByTimeAsync(60_000);
    unsubscribe();

    expect(calls).toBe(1);
  });

  it("visibilitychange(visible)가 오면 idle-timeout을 기다리지 않고 즉시 재연결한다", async () => {
    vi.useFakeTimers();
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      return Promise.resolve({ ok: true, status: 200, body: neverRespondingStream() });
    }) as unknown as typeof fetch;

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md"], () => undefined);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toBe(1);

    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(2_000);
    unsubscribe();

    expect(calls).toBe(2);
  });

  it("해지하면 visibilitychange 를 쏴도 더는 재연결하지 않는다", async () => {
    vi.useFakeTimers();
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      return Promise.resolve({ ok: true, status: 200, body: neverRespondingStream() });
    }) as unknown as typeof fetch;

    const unsubscribe = createWorkspaceWatchPort().watch(["a.md"], () => undefined);
    await vi.advanceTimersByTimeAsync(1);
    unsubscribe();

    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(5_000);

    expect(calls).toBe(1);
  });
});
