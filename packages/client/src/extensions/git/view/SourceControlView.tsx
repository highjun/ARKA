import { useViewModel } from "#core/viewmodel";
import { Button, Spinner, TextInput } from "@primer/react";
import { Icon } from "#component/Icon";
import { Text } from "#component/Text";
import { ChangeList } from "../component/ChangeList";
import type { ChangeRow } from "../viewmodel/ISourceControlViewModel";
import { SourceControlViewModelToken } from "../viewmodel/ISourceControlViewModel";
import styles from "./SourceControlView.module.css";

/** diff 탭의 kind. 조립부의 `TabContentRegistry` 등록과 같아야 한다. */
export const DIFF_TAB_KIND = "diff";

/**
 * 사이드바의 소스 제어 패널 — 커밋 메시지, 스테이지된 변경, 변경 사항. 행을 누르면 diff 탭을 연다.
 * VSCode SCM 뷰의 최소 집합이다.
 */
export const SourceControlView = ({
  onOpenTab,
}: {
  readonly onOpenTab: (tab: { readonly id: string; readonly kind: string; readonly title: string }) => void;
}) => {
  const viewModel = useViewModel(SourceControlViewModelToken);

  if (!viewModel.repository) {
    return (
      <div className={styles["empty"]}>
        {viewModel.loading ? (
          <Spinner size="small" srText="읽는 중" />
        ) : (
          <Text size="small" tone="muted">
            {viewModel.failure ?? "이 워크스페이스는 Git 저장소가 아니다."}
          </Text>
        )}
      </div>
    );
  }

  const openDiff = (row: ChangeRow) =>
    onOpenTab({
      id: `${row.staged ? "staged" : "wt"}:${row.path}`,
      kind: DIFF_TAB_KIND,
      title: `${row.path}${row.staged ? " (스테이지)" : ""}`,
    });

  return (
    <div data-component="SourceControlView" className={styles["root"]}>
      <div className={styles["header"]}>
        <Icon iconId="sourceControl" size="sm" />
        <Text size="small">{viewModel.branch ?? "(분리된 HEAD)"}</Text>
        <Button size="small" variant="invisible" aria-label="새로 고침" onClick={() => viewModel.refresh()}>
          새로 고침
        </Button>
        {viewModel.loading ? <Spinner size="small" srText="읽는 중" /> : null}
      </div>
      <form
        className={styles["commit"]}
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.commit();
        }}
      >
        <TextInput
          block
          aria-label="커밋 메시지"
          placeholder="커밋 메시지"
          value={viewModel.message}
          onChange={(event) => viewModel.setMessage(event.target.value)}
        />
        <Button type="submit" size="small" variant="primary" disabled={!viewModel.canCommit}>
          커밋
        </Button>
      </form>
      {viewModel.failure === null ? null : (
        <Text size="small" tone="danger" className={styles["failure"]}>
          {viewModel.failure}
        </Text>
      )}
      {viewModel.lastCommit === null ? null : (
        <Text size="small" tone="muted" className={styles["failure"]}>
          커밋됨 {viewModel.lastCommit}
        </Text>
      )}
      <div className={styles["lists"]}>
        <ChangeList
          heading="스테이지된 변경"
          entries={viewModel.staged}
          action={{
            label: "해제",
            iconId: "close",
            onAll: () => viewModel.unstageAll(),
            onOne: (path) => viewModel.unstage(path),
          }}
          onSelect={(entry) => openDiff({ ...entry, staged: true })}
        />
        <ChangeList
          heading="변경 사항"
          entries={viewModel.unstaged}
          action={{
            label: "스테이지",
            iconId: "add",
            onAll: () => viewModel.stageAll(),
            onOne: (path) => viewModel.stage(path),
          }}
          onSelect={(entry) => openDiff({ ...entry, staged: false })}
        />
        {viewModel.staged.length + viewModel.unstaged.length === 0 && !viewModel.loading ? (
          <Text size="small" tone="muted" className={styles["failure"]}>
            변경 없음
          </Text>
        ) : null}
      </div>
    </div>
  );
};
