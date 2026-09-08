import { useViewModel } from '#core/view-model';
import { ActionList, Button, Spinner, TextInput } from '@primer/react';
import { Text } from '#components/common';
import { SearchViewModelToken } from '../viewmodel/ISearchViewModel';
import styles from './SearchView.module.css';

/**
 * 사이드바의 검색 패널. 결과를 누르면 그 파일을 연다 — 줄로 가는 것은 에디터가 커서 이동을 받을 때(백로그).
 */
export const SearchView = ({ onFileOpen }: { readonly onFileOpen: (path: string) => void }) => {
  const viewModel = useViewModel(SearchViewModelToken);
  return (
    <div data-component="SearchView" className={styles['root']}>
      <form
        className={styles['form']}
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.submit();
        }}
      >
        <TextInput block aria-label="검색어" placeholder="찾을 내용" value={viewModel.query} onChange={(event) => viewModel.setQuery(event.target.value)} />
        <div className={styles['options']}>
          <Button type="button" size="small" variant={viewModel.caseSensitive ? 'primary' : 'default'} aria-pressed={viewModel.caseSensitive} aria-label="대소문자 구분" onClick={() => viewModel.toggleCaseSensitive()}>
            Aa
          </Button>
          <Button type="button" size="small" variant={viewModel.regex ? 'primary' : 'default'} aria-pressed={viewModel.regex} aria-label="정규식" onClick={() => viewModel.toggleRegex()}>
            .*
          </Button>
        </div>
      </form>
      <div className={styles['summary']}>
        {viewModel.searching ? <Spinner size="small" srText="찾는 중" /> : null}
        <Text size="small" tone={viewModel.failure === null ? 'muted' : 'danger'}>
          {viewModel.failure ?? viewModel.summary}
        </Text>
      </div>
      <div className={styles['results']}>
        <ActionList>
          {viewModel.rows.map((file) => (
            <ActionList.Group key={file.path}>
              <ActionList.GroupHeading as="h3">{file.path}</ActionList.GroupHeading>
              {file.matches.map((match) => (
                <ActionList.Item key={`${String(match.line)}:${String(match.column)}`} onSelect={() => onFileOpen(file.path)}>
                  <ActionList.LeadingVisual>
                    <Text size="small" tone="muted">
                      {match.line}
                    </Text>
                  </ActionList.LeadingVisual>
                  <span className={styles['preview']}>{match.preview.trim()}</span>
                </ActionList.Item>
              ))}
            </ActionList.Group>
          ))}
        </ActionList>
      </div>
    </div>
  );
};
