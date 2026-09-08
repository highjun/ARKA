import { createContainer, scoped, singleton } from '#core/di';
import { ViewModelProvider } from '#core/view-model';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchModelToken } from '../model/ISearchModel';
import { MockSearchService } from '../model/MockSearchService';
import { SearchModel } from '../model/SearchModel';
import { SearchViewModelToken } from '../viewmodel/ISearchViewModel';
import { SearchViewModel } from '../viewmodel/SearchViewModel';
import { SearchView } from './SearchView';

const mount = (onFileOpen = vi.fn()) => {
  const container = createContainer('test');
  container.register(SearchModelToken, singleton(() => new SearchModel({ searchService: new MockSearchService({ 'src/a.ts': 'const hello = 1;' }) })));
  container.register(SearchViewModelToken, scoped((c) => new SearchViewModel({ searchModel: c.resolve(SearchModelToken), debounceMs: 1 })));
  render(
    <ViewModelProvider container={container.createScope('view')}>
      <SearchView onFileOpen={onFileOpen} />
    </ViewModelProvider>,
  );
  return { onFileOpen };
};

describe('SearchView', () => {
  it('입력하면 결과가 뜨고 누르면 파일을 연다', async () => {
    const { onFileOpen } = mount();
    await act(async () => {
      fireEvent.change(screen.getByLabelText('검색어'), { target: { value: 'hello' } });
    });
    expect(await screen.findByText('src/a.ts')).toBeInTheDocument();
    expect(screen.getByText('1개 파일에서 1개')).toBeInTheDocument();
    fireEvent.click(screen.getByText('const hello = 1;'));
    expect(onFileOpen).toHaveBeenCalledWith('src/a.ts', { line: 1, column: 7 });
  });
});
