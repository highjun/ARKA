import { useViewModel } from "#core/viewmodel";
import { Banner } from "@primer/react";
import { TextEditor } from "../component/TextEditor";
import { FileContentViewModelToken } from "../viewmodel/IFileContentViewModel";
import styles from "./FileContentView.module.css";

/**
 * 어느 파일인지는 **props 로 받는다** — 탭 하나가 파일 하나이고, 어느 탭이 열려 있는지는 Shell 이
 * 안다. 이 View 가 그것을 스스로 고르면 탭과 내용이 두 곳에서 갈린다.
 *
 * `useEffect`로 `openFile(path)`를 걸지 않는다 — `useViewModel` 하나만 부른다는 규율
 * (`view-only-uses-view-model`) 때문이다. 대신 렌더 본문에서 그냥 부른다 —
 * `IFileContentModel.open`이 "이미 읽은 파일은 다시 읽지 않는다"로 이미 멱등이라, 매 렌더 불러도
 * 안전하다(2026-09-04).
 *
 * `TextEditor`가 CodeMirror를 감싸고 있어서 줄번호와 문법 강조를 이미 갖는다 — 여기서 더할 것은
 * 안내 한 줄뿐이다. **편집·저장은 `TextEditor`에 그대로 위임한다** — 버퍼 관리·저장 버튼·Ctrl+S는
 * 전부 그 컴포넌트가 갖고, 여기서는 ViewModel이 이미 접어 준 값을 그대로 넘길 뿐이다.
 */
export const FileContentView = ({
  path,
  reveal = null,
}: {
  readonly path: string;
  readonly reveal?: { readonly line: number; readonly column: number; readonly seq: number } | null;
}) => {
  const viewModel = useViewModel(FileContentViewModelToken);
  viewModel.openFile(path);

  // 아직 담기지 않은 것(`undefined`, `openFile`이 막 부른 참이라 atom에 아직 안 실림)도 읽는
  // 중과 같은 뜻이다 — 둘 다 에디터 오버레이 스피너로 표현한다.
  const row = viewModel.rows[path];
  const loading = row === undefined || row.loading;

  return (
    <div className={styles["root"]}>
      {row?.notice == null ? null : <Banner variant="info" title={row.notice} layout="compact" />}
      <TextEditor
        className={styles["textEditor"]}
        chrome="none"
        path={path}
        content={row?.content ?? ""}
        readOnly={row?.readOnly ?? true}
        onChange={(content) => viewModel.editFile(path, content)}
        onSave={() => viewModel.saveFile(path)}
        isDirty={row?.isDirty ?? false}
        isSaving={row?.isSaving ?? false}
        loading={loading}
        revealAt={reveal}
      />
    </div>
  );
};
