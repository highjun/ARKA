import { describe, expect, it } from 'vitest';
import { MockSearchService } from './MockSearchService';
import { SearchModel } from './SearchModel';

const files = { 'a.md': 'hello world\nhello again', 'b.ts': 'const x = 1' };

describe('SearchModel', () => {
  it('조건을 바꿔도 run 전에는 결과가 그대로다', async () => {
    const model = new SearchModel({ searchService: new MockSearchService(files) });
    model.setQuery({ query: 'hello' });
    expect(model.result).toBeNull();
    await model.run();
    expect(model.status).toBe('done');
    expect(model.result?.matches).toHaveLength(2);
    model.setQuery({ query: 'x' });
    expect(model.result?.matches).toHaveLength(2);
  });

  it('빈 검색어는 결과를 비우고 idle이다', async () => {
    const model = new SearchModel({ searchService: new MockSearchService(files) });
    model.setQuery({ query: 'hello' });
    await model.run();
    model.setQuery({ query: '   ' });
    await model.run();
    expect(model.status).toBe('idle');
    expect(model.result).toBeNull();
  });

  it('실패는 failure에 남고 던지지 않는다', async () => {
    const model = new SearchModel({ searchService: { search: () => Promise.reject(new Error('서버 없음')) } });
    model.setQuery({ query: 'x' });
    await model.run();
    expect(model.status).toBe('error');
    expect(model.failure).toBe('서버 없음');
  });

  it('늦게 끝난 옛 검색이 새 결과를 덮지 않는다', async () => {
    let releaseFirst: (value: { matches: []; truncated: false; filesScanned: number }) => void = () => undefined;
    let calls = 0;
    const model = new SearchModel({
      searchService: {
        search: () => {
          calls += 1;
          return calls === 1 ? new Promise((resolve) => (releaseFirst = resolve)) : Promise.resolve({ matches: [], truncated: false, filesScanned: 2 });
        },
      },
    });
    model.setQuery({ query: 'a' });
    const first = model.run();
    model.setQuery({ query: 'b' });
    await model.run();
    releaseFirst({ matches: [], truncated: false, filesScanned: 1 });
    await first;
    expect(model.result?.filesScanned).toBe(2);
  });
});
