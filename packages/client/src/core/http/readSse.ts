const DEFAULT_IDLE_TIMEOUT_MS = 45_000;

type SseOptions = {
  readonly headers?: Record<string, string>;
  readonly signal: AbortSignal;
  readonly idleTimeoutMs?: number;
};

export const readSse = async (
  url: string,
  { headers, signal, idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS }: SseOptions,
  onData: (data: string) => void,
): Promise<void> => {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) throw new Error(`stream failed (${String(response.status)})`);
  if (!response.body) throw new Error("stream has no body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const chunk = await readWithIdleTimeout(reader, signal, idleTimeoutMs);
    if (chunk.done) return;
    buffer += decoder.decode(chunk.value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const data = dataOf(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      if (data !== null) onData(data);
      boundary = buffer.indexOf("\n\n");
    }
  }
};

const dataOf = (frame: string): string | null => {
  const lines = frame.split("\n").filter((line) => line.startsWith("data:"));
  if (lines.length === 0) return null;
  return lines.map((line) => line.slice(5).trim()).join("");
};

const readWithIdleTimeout = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
  idleTimeoutMs: number,
): Promise<Awaited<ReturnType<ReadableStreamDefaultReader<Uint8Array>["read"]>>> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("stream idle timeout")), idleTimeoutMs);
  });
  const aborted = new Promise<never>((_, reject) => {
    if (signal.aborted) {
      reject(new Error("stream aborted"));
      return;
    }
    onAbort = () => reject(new Error("stream aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([reader.read(), timeout, aborted]);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
};

export const sleep = (ms: number, signal: AbortSignal): Promise<void> => {
  if (signal.aborted) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
};
