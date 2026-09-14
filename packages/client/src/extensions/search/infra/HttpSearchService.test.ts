import { afterEach, describe, expect, it } from 'vitest';
import { createSearchServicePort } from './HttpSearchService';

const originalFetch = globalThis.fetch;
const serverReplies = (body: unknown, status = 200) => {
  const urls: string[] = [];
  globalThis.fetch = ((input: unknown) => {
    urls.push(String(input));
    return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;
  return urls;
};

describe('HttpSearchService', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('조건을 쿼리로 싣고 계약대로 읽는다', async () => {
    const body = { matches: [{ path: 'a', line: 1, column: 1, preview: 'x' }], truncated: false, filesScanned: 1 };
    const urls = serverReplies(body);
    expect(await createSearchServicePort().search({ query: 'a b', path: 'src', regex: true, caseSensitive: false })).toEqual(body);
    expect(urls[0]).toBe('/api/search?query=a+b&path=src&regex=true&caseSensitive=false');
  });

  it('실패하면 상태를 담아 던진다', async () => {
    serverReplies(null, 500);
    await expect(createSearchServicePort().search({ query: 'a', path: '', regex: false, caseSensitive: false })).rejects.toThrow(/500/u);
  });
});
