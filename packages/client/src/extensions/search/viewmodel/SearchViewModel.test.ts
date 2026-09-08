import { describe, expect, it } from 'vitest';
import { MockSearchService } from '../model/MockSearchService';
import { SearchModel } from '../model/SearchModel';
import { SearchViewModel } from './SearchViewModel';

const settled = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const make = () => {
  const model = new SearchModel({ searchService: new MockSearchService({ 'a.md': 'hello\nhello', 'b.md': 'hello' }) });
  return new SearchViewModel({ searchModel: model, debounceMs: 1 });
};

describe('SearchViewModel', () => {
  it('입력하면 디바운스 뒤 찾고 파일별로 묶는다', async () => {
    const viewModel = make();
    viewModel.setQuery('hello');
    expect(viewModel.rows).toEqual([]);
    await settled();
    expect(viewModel.rows.map((r) => [r.path, r.matches.length])).toEqual([['a.md', 2], ['b.md', 1]]);
    expect(viewModel.summary).toBe('2개 파일에서 3개');
    expect(viewModel.searching).toBe(false);
  });

  it('submit은 바로 찾는다', async () => {
    const viewModel = make();
    viewModel.setQuery('hello');
    viewModel.submit();
    await settled(0);
    expect(viewModel.rows).toHaveLength(2);
  });

  it('토글이 조건을 바꾸고 다시 찾는다', async () => {
    const viewModel = make();
    viewModel.setQuery('HELLO');
    await settled();
    expect(viewModel.rows).toHaveLength(2);
    viewModel.toggleCaseSensitive();
    expect(viewModel.caseSensitive).toBe(true);
    await settled();
    expect(viewModel.rows).toHaveLength(0);
    expect(viewModel.summary).toBe('결과 없음');
  });
});
