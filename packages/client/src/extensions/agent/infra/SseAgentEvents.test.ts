import { afterEach, describe, expect, it } from "vitest";
import { createAgentEventsPort } from "./SseAgentEvents";

const encoder = new TextEncoder();
const frame = (event: object) => `data: ${JSON.stringify(event)}\n\n`;
const originalFetch = globalThis.fetch;
const serverSends = (chunks: readonly string[]) => {
  const urls: string[] = [];
  globalThis.fetch = ((input: unknown) => {
    urls.push(String(input));
    return Promise.resolve({
      ok: true,
      status: 200,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
          controller.close();
        },
      }),
    });
  }) as unknown as typeof fetch;
  return urls;
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const head = { sessionId: "s", runId: null, at: 0 };

describe("SseAgentEvents", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("since를 쿼리로 싣고, 계약에 맞는 이벤트만 넘기며, 모르는 type은 버린다", async () => {
    const urls = serverSends([
      frame({ ...head, seq: 3, type: "session.renamed", title: "a" }),
      frame({ ...head, seq: 4, type: "future" }),
      ": ping\n\n",
    ]);
    const got: number[] = [];
    const unsubscribe = createAgentEventsPort().subscribe("s", 2, (event) => got.push(event.seq));
    await flush();
    unsubscribe();
    expect(urls[0]).toBe("/api/agent/sessions/s/events?since=2");
    expect(got).toEqual([3]);
  });

  it("이미 본 seq는 다시 넘기지 않는다", async () => {
    serverSends([
      frame({ ...head, seq: 1, type: "session.renamed", title: "a" }),
      frame({ ...head, seq: 1, type: "session.renamed", title: "a" }),
    ]);
    const got: number[] = [];
    const unsubscribe = createAgentEventsPort().subscribe("s", 0, (event) => got.push(event.seq));
    await flush();
    unsubscribe();
    expect(got).toEqual([1]);
  });
});
