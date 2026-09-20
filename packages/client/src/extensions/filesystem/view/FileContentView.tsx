import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Banner } from "@primer/react";
import { TextEditor } from "../component/TextEditor";
import styles from "./FileContentView.module.css";

export const FileContentView = observer(function FileContentView({ path }: { readonly path: string }) {
  const viewModel = useViewModel("arka.filesystem.fileContentViewModel");

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
        revealAt={viewModel.reveals[path] ?? null}
      />
    </div>
  );
});
