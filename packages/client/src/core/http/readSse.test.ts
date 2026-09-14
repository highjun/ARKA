import { afterEach, describe, expect, it } from "vitest";
import { readSse } from "./readSse";

const encoder = new TextEncoder();
const streamOf = (chunks: readonly string[], { close = true } = {}): ReadableStream<Uint8Array> =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      if (close) controller.close();
    },
  });

const originalFetch = globalThis.fetch;
const serverSends = (chunks: readonly string[], status = 200, close = true): void => {
  globalThis.fetch = (() =>
    Promise.resolve({ ok: status < 400, status, body: streamOf(chunks, { close }) })) as unknown as typeof fetch;
};

describe("readSse", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("data 프레임마다 부르고 주석 프레임은 건너뛴다", async () => {
    serverSends(['data: {"a":1}\n\n: ping\n\nid: 2\ndata: {"a":2}\n\n']);
    const got: string[] = [];
    await readSse("/x", { signal: new AbortController().signal }, (d) => got.push(d));
    expect(got).toEqual(['{"a":1}', '{"a":2}']);
  });

  it("프레임이 청크 경계에 걸려도 이어 붙인다", async () => {
    serverSends(['data: {"a"', ":1}\n", '\ndata: {"a":2}\n\n']);
    const got: string[] = [];
    await readSse("/x", { signal: new AbortController().signal }, (d) => got.push(d));
    expect(got).toEqual(['{"a":1}', '{"a":2}']);
  });

  it("여러 data 줄은 하나로 잇는다", async () => {
    serverSends(["data: ab\ndata: cd\n\n"]);
    const got: string[] = [];
    await readSse("/x", { signal: new AbortController().signal }, (d) => got.push(d));
    expect(got).toEqual(["abcd"]);
  });

  it("실패 응답이면 던진다", async () => {
    serverSends([], 404);
    await expect(readSse("/x", { signal: new AbortController().signal }, () => undefined)).rejects.toThrow(/404/u);
  });

  it("idle 타임아웃이 지나면 던진다", async () => {
    serverSends([], 200, false);
    await expect(
      readSse("/x", { signal: new AbortController().signal, idleTimeoutMs: 10 }, () => undefined),
    ).rejects.toThrow(/idle/u);
  });

  it("abort하면 던진다", async () => {
    serverSends([], 200, false);
    const controller = new AbortController();
    const pending = readSse("/x", { signal: controller.signal }, () => undefined);
    controller.abort();
    await expect(pending).rejects.toThrow(/aborted/u);
  });
});
