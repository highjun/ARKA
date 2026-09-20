import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { ConfirmationDialog, Dialog, Spinner } from "@primer/react";
import { Blankslate } from "@primer/react/experimental";
import { Container } from "#component/Container";
import { FileTree } from "../component/FileTree";
import type { FileTreeItem } from "../component/FileTree";
import type { MouseEvent } from "react";
import { CommandContextMenu } from "./CommandContextMenu";
import type { ContextMenuTarget, DirectoryTreeStatus, FileTreeRow } from "../viewmodel/IDirectoryTreeViewModel";
import styles from "./DirectoryTreeView.module.css";

const toItem = (row: FileTreeRow): FileTreeItem => ({
  id: row.id,
  name: row.name,
  type: row.type,
  disabled: row.disabled,
  loading: row.loading,
  children: row.children?.map(toItem),
});

const emptyLabelOf = (status: DirectoryTreeStatus) =>
  status === "loaded" ? (
    <Blankslate>
      <Blankslate.Heading as="h2">비어 있다</Blankslate.Heading>
    </Blankslate>
  ) : (
    <Blankslate>
      <Blankslate.Visual>
        <Spinner size="medium" srText="워크스페이스를 읽는 중" />
      </Blankslate.Visual>
    </Blankslate>
  );

const deleteTitleOf = (targets: readonly ContextMenuTarget[]) =>
  targets.length === 1 ? `${targets[0]!.name}을(를) 지울까요?` : `${String(targets.length)}개 항목을 지울까요?`;

const deleteSubtitleOf = (targets: readonly ContextMenuTarget[]) =>
  targets.some((target) => target.type === "folder")
    ? "안의 내용까지 전부 사라진다. 되돌릴 수 없다."
    : "되돌릴 수 없다.";

export const DirectoryTreeView = observer(function DirectoryTreeView() {
  const viewModel = useViewModel("arka.filesystem.directoryTreeViewModel");
  const fileContentViewModel = useViewModel("arka.filesystem.fileContentViewModel");

  const handleActivate = (item: FileTreeItem) => {
    if (item.type !== "folder") viewModel.openFile(item.id);
  };
  const handleRowDoubleClick = (item: FileTreeItem) => {
    if (item.type !== "folder") viewModel.pinFile(item.id);
  };
  const handleExpand = (item: FileTreeItem, expanded: boolean) => viewModel.setFolderExpanded(item.id, expanded);
  const handleDrop = (source: FileTreeItem, target: FileTreeItem) => {
    viewModel
      .moveEntry(source.id, target.id)
      .then((newPath) => {
        fileContentViewModel.retargetOpenFile(source.id, newPath);
        viewModel.retargetTabs(source.id, newPath);
      })
      .catch(() => undefined);
  };

  const onContainerContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[role="treeitem"]') === null) viewModel.setContextTarget(null);
  };
  const onFileTreeContextMenu = (item: ContextMenuTarget) => viewModel.setContextTarget(item);
  const onContextMenuOpenChange = (open: boolean) => {
    if (!open) viewModel.setContextTarget(null);
  };

  if (viewModel.failure !== null) {
    return (
      <Blankslate>
        <Blankslate.Heading as="h2">워크스페이스를 읽지 못했다</Blankslate.Heading>
        <Blankslate.Description>{viewModel.failure}</Blankslate.Description>
      </Blankslate>
    );
  }

  return (
    <>
      <CommandContextMenu
        menuId="filesystem.explorer.context"
        context={viewModel.contextTarget}
        onOpenChange={onContextMenuOpenChange}
      >
        <div className={styles["fill"]} onContextMenu={onContainerContextMenu}>
          <Container chrome="none" className={styles["fill"]}>
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
        <ConfirmationDialog
          title={deleteTitleOf(viewModel.deleteTargets)}
          confirmButtonContent="지우기"
          cancelButtonContent="취소"
          confirmButtonType="danger"
          onClose={(gesture) => (gesture === "confirm" ? viewModel.confirmDelete() : viewModel.cancelDelete())}
        >
          {deleteSubtitleOf(viewModel.deleteTargets)}
        </ConfirmationDialog>
      )}

      {viewModel.failureNotice === null ? null : (
        <Dialog
          role="alertdialog"
          title="문제가 생겼다"
          onClose={() => viewModel.dismissFailureNotice()}
          footerButtons={[
            {
              content: "확인",
              buttonType: "primary",
              autoFocus: true,
              onClick: () => viewModel.dismissFailureNotice(),
            },
          ]}
        >
          {viewModel.failureNotice}
        </Dialog>
      )}
    </>
  );
});
