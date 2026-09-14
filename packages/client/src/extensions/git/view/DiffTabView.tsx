import { useViewModel } from '#core/viewmodel';
import { Spinner } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import { SourceControlViewModelToken } from '../viewmodel/ISourceControlViewModel';
import styles from './DiffTabView.module.css';

/**
 * diff 탭. 어느 변경인지는 탭 id(`staged:path` / `wt:path`)가 말한다. `openDiff`는 멱등이라 렌더마다 부른다.
 * unified diff를 줄 단위로 색만 칠한다 — 나란히 보기는 에디터가 diff를 받을 때(백로그).
 */
export const DiffTabView = ({ tabId }: { readonly tabId: string }) => {
  const viewModel = useViewModel(SourceControlViewModelToken);
  viewModel.openDiff(tabId);
  const diff = viewModel.diffOf(tabId);

  if (diff.loading && diff.text === '') {
    return (
      <Blankslate>
        <Blankslate.Visual>
          <Spinner size="medium" srText="diff를 읽는 중" />
        </Blankslate.Visual>
      </Blankslate>
    );
  }
  if (diff.failure !== null) {
    return (
      <Blankslate>
        <Blankslate.Heading as="h2">diff를 읽지 못했다</Blankslate.Heading>
        <Blankslate.Description>{diff.failure}</Blankslate.Description>
      </Blankslate>
    );
  }
  if (diff.text === '') {
    return (
      <Blankslate>
        <Blankslate.Heading as="h2">차이가 없다</Blankslate.Heading>
      </Blankslate>
    );
  }
  return (
    <pre data-component="DiffTabView" className={styles['root']}>
      {diff.text.split('\n').map((line, index) => (
        <span key={index} className={styles['line']} data-kind={kindOf(line)}>
          {line}
          {'\n'}
        </span>
      ))}
    </pre>
  );
};

const kindOf = (line: string): 'add' | 'del' | 'hunk' | 'meta' | 'ctx' => {
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta';
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'del';
  if (line.startsWith('diff ') || line.startsWith('index ')) return 'meta';
  return 'ctx';
};
