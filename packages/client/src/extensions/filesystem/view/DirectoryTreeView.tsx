import { useViewModel } from '#core/view-model';
import { Button, Spinner } from '@primer/react';
import { Container, Dialog } from '#components/layout';
import { FileTree } from '../component';
import type { FileTreeItem } from '../component';
import type { MouseEvent } from 'react';
import { CommandContextMenu } from '#core/commands';
import type {
  ContextMenuTarget,
  DirectoryTreeStatus,

  FileTreeRow,
} from '../viewmodel/IDirectoryTreeViewModel';
import { DirectoryTreeViewModelToken } from '../viewmodel/IDirectoryTreeViewModel';
import { FileContentViewModelToken } from '../viewmodel/IFileContentViewModel';
import styles from './DirectoryTreeView.module.css';

/**
 * DI·구독·마크업이 한 파일에 있다 — `binding.tsx`+`styled.tsx` 분리가 지키려던 것("DI를 아는
 * 파일을 하나로 가둔다")은 이제 호출 표면 제한(`arka/view-only-uses-view-model` — `useViewModel`
 * 하나만 부른다)으로 지킨다(2026-09-04, D9). Storybook 격리 렌더링이라는 원래 명분은 실현된 적이
 * 없어서(스토리는 있었지만 아무도 안 열어봄) 그 파일과 함께 스토리도 지웠다.
 *
 * 우클릭 메뉴·삭제 확인의 **상태와 결정**은 전부 `IDirectoryTreeViewModel`에 있다 — 이 파일에는
 * `useState`/`useEffect`/`useCallback`이 없다(`view-only-uses-view-model`이 막는다). 이름 입력은
 * 더는 `Dialog`+`TextInput` 모달이 아니다 — `FileTree`의 `editingId`가 트리 행 자체를 `<input>`
 * 으로 바꾼다(2026-09-05, B8) — 새 파일/새 폴더도 실존하지 않는 "유령 행"을 그 자리로 끼워 넣어
 * 같은 인라인 입력을 쓴다(`IDirectoryTreeViewModel`의 `#withEditingGhost`).
 */
const toItem = (row: FileTreeRow): FileTreeItem => ({
  id: row.id,
  name: row.name,
  type: row.type,
  disabled: row.disabled,
  loading: row.loading,
  children: row.children?.map(toItem),
});

const EMPTY_LABEL_STYLE = {
  padding: 'var(--space-sm)',
  fontSize: 'var(--text-body-size-small)',
  lineHeight: 'var(--text-body-lineHeight-small)',
  color: 'var(--fgColor-muted)',
} as const;

const LOADING_STYLE = { display: 'flex', justifyContent: 'center', padding: 'var(--space-lg)' } as const;

/** 행이 아직 없는 이유가 둘이라 표시도 둘이다 — 기다리는 중이면 돌고, 정말 비었으면 그렇게 말한다. */
const emptyLabelOf = (status: DirectoryTreeStatus) =>
  status === 'loaded' ? (
    <p style={EMPTY_LABEL_STYLE}>비어 있다</p>
  ) : (
    <div style={LOADING_STYLE}>
      <Spinner size="medium" srText="워크스페이스를 읽는 중" />
    </div>
  );

const deleteTitleOf = (targets: readonly ContextMenuTarget[]) =>
  targets.length === 1 ? `${targets[0]!.name}을(를) 지울까요?` : `${String(targets.length)}개 항목을 지울까요?`;

const deleteSubtitleOf = (targets: readonly ContextMenuTarget[]) =>
  targets.some((target) => target.type === 'folder') ? '안의 내용까지 전부 사라진다. 되돌릴 수 없다.' : '되돌릴 수 없다.';

export const DirectoryTreeView = ({
  onFileOpen,
  onFileMove,
  onFilePin,
}: {
  readonly onFileOpen: (path: string) => void;
  readonly onFileMove: (oldPath: string, newPath: string) => void;
  /** 파일 행을 더블클릭했다 — 미리보기 탭을 고정한다(Tab 헤더 더블클릭과 같은 뜻). */
  readonly onFilePin: (path: string) => void;
}) => {
  const viewModel = useViewModel(DirectoryTreeViewModelToken);
  const fileContentViewModel = useViewModel(FileContentViewModelToken);

  // 컴포넌트 어휘(FileTreeItem)를 ViewModel 어휘(경로 + 폴더 여부)로 바꾸기만 한다.
  const handleActivate = (item: FileTreeItem) => {
    if (item.type !== 'folder') onFileOpen(item.id);
  };
  const handleRowDoubleClick = (item: FileTreeItem) => {
    if (item.type !== 'folder') onFilePin(item.id);
  };
  const handleExpand = (item: FileTreeItem, expanded: boolean) => viewModel.setFolderExpanded(item.id, expanded);
  /**
   * 옮긴 뒤에만 후속 조치를 한다 — 실패하면 `moveEntry`가 이미 `failureNotice`에 담고 다시
   * 던지므로 여기서는 조용히 넘긴다.
   *
   * **편집 버퍼는 여기서 옮긴다.** 이름이 바뀌면 열려 있던 내용도 새 경로를 따라가야 하는데,
   * 그건 파일 도메인의 일이라 셸이 대신 해주지 않는다. 셸에는 "탭이 가리키는 경로가 바뀌었다"만
   * 올린다.
   */
  const handleDrop = (source: FileTreeItem, target: FileTreeItem) => {
    viewModel
      .moveEntry(source.id, target.id)
      .then((newPath) => {
        fileContentViewModel.retargetOpenFile(source.id, newPath);
        onFileMove(source.id, newPath);
      })
      .catch(() => undefined);
  };

  // `FileTree`의 `onContextMenu`는 행을 우클릭했을 때만 온다. 행이 없는 빈 곳을 우클릭하면 안 와서
  // `contextTarget`이 이전 값에 머문다 — 감싼 영역에서 실제로 행 위였는지 다시 확인해 아니면 지운다.
  const onContainerContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[role="treeitem"]') === null) viewModel.setContextTarget(null);
  };
  const onFileTreeContextMenu = (item: ContextMenuTarget) => viewModel.setContextTarget(item);
  const onContextMenuOpenChange = (open: boolean) => {
    if (!open) viewModel.setContextTarget(null);
  };

  if (viewModel.failure !== null) {
    return <p style={{ ...EMPTY_LABEL_STYLE, color: 'var(--fgColor-danger)' }}>{viewModel.failure}</p>;
  }

  return (
    <>
      {/* 우클릭 메뉴는 이제 커맨드 레지스트리가 그린다(2026-09-04, Menu 축 실배선) — 무엇이
          뜨는지는 `app/filesystemCommands.ts`가 `registerMenuItem`으로 등록한 것이다. `context`는
          지금 우클릭된 대상 — 커맨드의 `execute(context)`로 그대로 전달된다. */}
      <CommandContextMenu menuId="filesystem.explorer.context" context={viewModel.contextTarget} onOpenChange={onContextMenuOpenChange}>
        {/* 스크롤 컨테이너는 Container 다 — hover 할 때만 스크롤바가 보인다. */}
        <div className={styles['fill']} onContextMenu={onContainerContextMenu}>
          <Container chrome="none" className={styles['fill']}>
            <FileTree
              chrome="none"
              items={viewModel.rows.map(toItem)}
              expandedIds={viewModel.expandedIds}
              selectedIds={viewModel.selectedIds}
              emptyLabel={emptyLabelOf(viewModel.status)}
              editingId={viewModel.editingId}
              onEditCommit={(_item, value) => viewModel.onEditCommit(value)}
              onEditCancel={() => viewModel.onEditCancel()}
              onSelectedIdsChange={(ids) => viewModel.setSelection(ids)}
              onActivate={handleActivate}
              onRowDoubleClick={handleRowDoubleClick}
              onToggleFolder={handleExpand}
              onContextMenu={onFileTreeContextMenu}
              onItemDrop={handleDrop}
            />
          </Container>
        </div>
      </CommandContextMenu>

      {viewModel.deleteTargets.length === 0 ? null : (
        <Dialog
          onClose={() => viewModel.cancelDelete()}
          iconId="warning"
          tone="attention"
          title={deleteTitleOf(viewModel.deleteTargets)}
          description={deleteSubtitleOf(viewModel.deleteTargets)}
        >
          <Dialog.Actions>
            <Button variant="default" onClick={() => viewModel.cancelDelete()}>
              취소
            </Button>
            <Button variant="danger" onClick={() => viewModel.confirmDelete()}>
              지우기
            </Button>
          </Dialog.Actions>
        </Dialog>
      )}

      {viewModel.failureNotice === null ? null : (
        <Dialog
          onClose={() => viewModel.dismissFailureNotice()}
          iconId="error"
          tone="danger"
          title="문제가 생겼다"
          description={viewModel.failureNotice}
        >
          <Dialog.Actions>
            <Button variant="default" onClick={() => viewModel.dismissFailureNotice()}>
              확인
            </Button>
          </Dialog.Actions>
        </Dialog>
      )}
    </>
  );
};
