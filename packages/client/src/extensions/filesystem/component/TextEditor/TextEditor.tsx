import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./TextEditor.module.css";
import { useCodeMirrorEditor } from "./useCodeMirrorEditor";
import type { RevealPosition } from "./useCodeMirrorEditor";
import { Spinner } from "@primer/react";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";

type TextEditorChrome = "bordered" | "none";

export interface TextEditorProps extends Omit<ComponentPropsWithoutRef<"section">, "onChange" | "children"> {
  readonly ref?: Ref<HTMLElement>;
  readonly path: string;
  readonly content: string;
  readonly chrome?: TextEditorChrome;
  readonly readOnly?: boolean;
  readonly onChange?: (content: string) => void;
  readonly onSave?: () => void;
  readonly isDirty?: boolean;
  readonly isSaving?: boolean;
  readonly loading?: boolean;
  readonly revealAt?: RevealPosition | null;
}

export const TextEditor = ({
  path,
  content,
  className,
  chrome = "bordered",
  readOnly = true,
  onChange,
  onSave,
  isDirty = false,
  isSaving = false,
  loading = false,
  revealAt = null,
  ref,
  ...rest
}: TextEditorProps) => {
  const { hostRef, openSearch } = useCodeMirrorEditor({ path, content, readOnly, onChange, onSave, revealAt });

  return (
    <section
      ref={ref}
      aria-label={path}
      data-chrome={chrome}
      className={clsx(className, styles["root"])}
      {...rest}
      data-component="TextEditor"
    >
      <header className={styles["header"]}>
        <span className={styles["path"]}>{path}</span>
        <IconButton
          variant="invisible"
          size="small"
          aria-label="파일 안에서 찾기"
          onClick={openSearch}
          icon={() => <Icon iconId="search" size="sm" />}
        />
        {readOnly ? null : (
          <IconButton
            variant="invisible"
            size="small"
            aria-label={isSaving ? "저장하는 중" : "저장"}
            data-dirty={isDirty ? "" : undefined}
            className={styles["saveButton"]}
            disabled={isSaving || !isDirty}
            onClick={() => onSave?.()}
            icon={() => (isSaving ? <Spinner size="small" srText="저장하는 중" /> : <Icon iconId="save" size="sm" />)}
          />
        )}
      </header>
      <div className={styles["bodyWrapper"]}>
        <div ref={hostRef} className={styles["body"]} />
        {loading ? (
          <div className={styles["loadingOverlay"]}>
            <Spinner size="large" srText="읽는 중" />
          </div>
        ) : null}
      </div>
    </section>
  );
};
