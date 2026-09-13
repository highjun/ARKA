/**
 * SSE 스트림을 읽어 `data:` 프레임마다 `onData`를 부른다. 스트림이 끝나면 resolve, 실패·끊김·abort면 reject.
 *
 * `EventSource`를 쓰지 않는다 — 요청 헤더(프로토콜 버전)를 붙일 수 없다.
 *
 * idle 타임아웃: 이 시간 안에 아무 바이트도(주석 하트비트 포함) 안 오면 연결이 조용히 죽었다고 본다.
 * 모바일 NAT/프록시가 FIN 없이 끊는 경우 `reader.read()`만으로는 영원히 알 수 없다. 서버 하트비트
 * 15초의 3배다.
 */
export const DEFAULT_IDLE_TIMEOUT_MS = 45_000;

/** `signal`은 필수다 — 끊을 수 없는 스트림을 열지 않는다. */
export type SseOptions = {
  readonly headers?: Record<string, string>;
  readonly signal: AbortSignal;
  readonly idleTimeoutMs?: number;
};

/**
 * `data:` 줄만 골라 `onData`로 넘긴다 — 이벤트 이름과 주석 줄은 버린다.
 * 조용한 채로 `idleTimeoutMs`가 지나면 던진다: 끊긴 연결은 열린 채로 남기 때문이다.
 */
export const readSse = async (url: string, { headers, signal, idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS }: SseOptions, onData: (data: string) => void): Promise<void> => {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) throw new Error(`stream failed (${String(response.status)})`);
  if (!response.body) throw new Error('stream has no body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const chunk = await readWithIdleTimeout(reader, signal, idleTimeoutMs);
    if (chunk.done) return;
    buffer += decoder.decode(chunk.value, { stream: true });

    // SSE는 빈 줄로 프레임을 가른다. 마지막 조각은 아직 안 끝났을 수 있어 버퍼에 남긴다.
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const data = dataOf(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      if (data !== null) onData(data);
      boundary = buffer.indexOf('\n\n');
    }
  }
};

/** 프레임의 `data:` 줄들을 이어 붙인다. 주석(`: ping`)만 있는 프레임은 `null`. */
const dataOf = (frame: string): string | null => {
  const lines = frame.split('\n').filter((line) => line.startsWith('data:'));
  if (lines.length === 0) return null;
  return lines.map((line) => line.slice(5).trim()).join('');
};

/**
 * `reader.read()`가 idle 타임아웃 안에 안 끝나면 던진다. `signal`도 같이 경쟁시킨다 — `fetch`의
 * `signal`은 최초 연결에만 걸리고 이미 열린 스트림의 개별 read를 끊지는 않는다.
 */
const readWithIdleTimeout = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
  idleTimeoutMs: number,
  // `ReadableStreamReadResult`는 DOM lib에만 있는 이름이다 — Node 타입만 있는 곳(test/contract)에서도
  // 컴파일되도록 reader의 반환 타입에서 뽑는다.
): Promise<Awaited<ReturnType<ReadableStreamDefaultReader<Uint8Array>['read']>>> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('stream idle timeout')), idleTimeoutMs);
  });
  const aborted = new Promise<never>((_, reject) => {
    if (signal.aborted) {
      reject(new Error('stream aborted'));
      return;
    }
    onAbort = () => reject(new Error('stream aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([reader.read(), timeout, aborted]);
  } catch (error) {
    // 죽었다고 판단한 연결을 실제로 끊는다 — 안 그러면 새 연결을 여는 동안 좀비가 하나 더 쌓인다.
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
};

/** 대기 중에 abort되면 남은 시간을 기다리지 않고 즉시 풀린다. */
export const sleep = (ms: number, signal: AbortSignal): Promise<void> => {
  if (signal.aborted) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
};
