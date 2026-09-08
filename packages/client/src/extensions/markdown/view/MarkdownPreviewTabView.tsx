import { useViewModel } from '#core/viewmodel';
import { Banner, Spinner } from '@primer/react';
import { Text } from '#components/common';
import { MarkdownPreview } from '../component';
import { MarkdownPreviewViewModelToken } from '../viewmodel/IMarkdownPreviewViewModel';
import styles from './MarkdownPreviewTabView.module.css';

/** 미리보기 탭. 어느 파일인지는 탭 id(`preview:<path>`)가 말한다. `openPreview`는 멱등이라 렌더마다 부른다. */
export const MarkdownPreviewTabView = ({ tabId }: { readonly tabId: string }) => {
  const viewModel = useViewModel(MarkdownPreviewViewModelToken);
  viewModel.openPreview(tabId);
  const preview = viewModel.previewOf(tabId);

  if (preview.failure !== null) {
    return (
      <div className={styles['center']}>
        <Text tone="danger">{preview.failure}</Text>
      </div>
    );
  }
  if (preview.loading && preview.markdown === '') {
    return (
      <div className={styles['center']}>
        <Spinner size="medium" srText="읽는 중" />
      </div>
    );
  }
  return (
    <div className={styles['root']} data-component="MarkdownPreviewTabView">
      {preview.truncated ? <Banner variant="warning" title="파일이 커서 앞부분만 보여 준다" layout="compact" /> : null}
      <MarkdownPreview markdown={preview.markdown} />
    </div>
  );
};
