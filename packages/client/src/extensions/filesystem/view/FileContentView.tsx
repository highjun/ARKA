import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Banner } from "@primer/react";
import { TextEditor } from "../component/TextEditor";
import styles from "./FileContentView.module.css";

/**
 * 어느 파일인지는 **props 로 받는다** — 탭 하나가 파일 하나이고, 어느 탭이 열려 있는지는 Shell 이
 * 안다. 이 View 가 그것을 스스로 고르면 탭과 내용이 두 곳에서 갈린다.
 *
 * 여기서 `openFile`을 부르지 않는다 — 렌더 중에 Model을 바꾸면 React와 MobX가 둘 다 막는다. 여는 것은
 * 탭을 그리는 쪽(조립부의 `FileTab`)이 효과에서 한다. 이 View는 이미 열린 것을 그릴 뿐이다.
 *
 * `TextEditor`가 CodeMirror를 감싸고 있어서 줄번호와 문법 강조를 이미 갖는다 — 여기서 더할 것은
 * 안내 한 줄뿐이다. **편집·저장은 `TextEditor`에 그대로 위임한다** — 버퍼 관리·저장 버튼·Ctrl+S는
 * 전부 그 컴포넌트가 갖고, 여기서는 ViewModel이 이미 접어 준 값을 그대로 넘길 뿐이다.
 */
export const FileContentView = observer(function FileContentView({
  path,
  reveal = null,
}: {
  readonly path: string;
  readonly reveal?: { readonly line: number; readonly column: number; readonly seq: number } | null;
}) {
  const viewModel = useViewModel("arka.filesystem.fileContentViewModel");

  // 아직 담기지 않은 것(`undefined`, 열기가 막 시작된 참)도 읽는 중과 같은 뜻이다 — 둘 다 에디터
  // 오버레이 스피너로 표현한다.
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
});
