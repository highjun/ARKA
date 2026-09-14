import { clsx } from 'clsx';
import type { HTMLAttributes, Ref } from 'react';
import styles from './TextEditor.module.css';
import { useCodeMirrorEditor } from './useCodeMirrorEditor';
import type { RevealPosition } from './useCodeMirrorEditor';
import { Spinner } from '@primer/react';
import { Icon } from '#component/Icon';
import { IconButton } from '#component/IconButton';

/** 프레임(테두리·radius·배경) 유무 — 패널을 꽉 채워서 쓸 땐 `none`. `ScrollArea`와 같은 이름. */
export type TextEditorChrome = 'bordered' | 'none';

/**
 * 코드 한 편을 문법 강조와 함께 보여준다.
 *
 * `EditorTab` 과 props 를 맞춰 둔 것은 의도다 — 그 자리를 그대로 갈아끼울 수 있어야 한다. CodeMirror
 * 인스턴스 관리는 `useCodeMirrorEditor` 훅이 전담한다 — 여기는 구조(헤더·본문)만 조립한다.
 */
export interface TextEditorProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange' | 'children'> {
  /** 루트 `section`으로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 표시용이자 **언어를 고르는 근거**다(확장자). */
  readonly path: string;
  /** 보여줄 문서 전체 내용. */
  readonly content: string;
  /** 프레임(테두리·radius·배경) 유무 — 기본은 `bordered`. */
  readonly chrome?: TextEditorChrome;
  /**
   * 기본은 읽기 전용이다. 편집하려면 `false` 와 `onChange` 를 함께 준다 — 하나만 주면 타이핑이
   * 화면에서만 일어나고 아무 데도 전달되지 않는, 조용히 반쪽짜리인 상태가 된다.
   */
  readonly readOnly?: boolean;
  /** 문서가 바뀔 때마다(타이핑 한 글자씩) 전체 내용을 부른다. `readOnly` 면 호출되지 않는다. */
  readonly onChange?: (content: string) => void;
  /** 저장 버튼과 Ctrl/Cmd+S 둘 다 이것을 부른다. `readOnly` 면 버튼도 단축키도 없다. */
  readonly onSave?: () => void;
  /** 저장 버튼을 누를 수 있는지 — 저장할 변경이 있을 때만 켠다. */
  readonly isDirty?: boolean;
  /** 저장 중이면 버튼이 회전 표시로 바뀌고 다시 누를 수 없다. */
  readonly isSaving?: boolean;
  /** 파일을 여는 중이면 본문 위에 Circular Progress 오버레이를 띄운다. */
  readonly loading?: boolean;
  /** 이 위치로 커서를 옮기고 보이게 한다. `seq`가 바뀔 때마다 다시 간다. */
  readonly revealAt?: RevealPosition | null;
}

/**
 * 행을 명시한다(`grid-template-rows: auto 1fr`) — `grid` 만 두면 높이가 주어진 자리에서 헤더가
 * 본문과 같이 늘어난다. `EditorTab` 이 실제로 그렇게 화면 절반을 먹었다.
 */
export const TextEditor = ({
  path,
  content,
  className,
  chrome = 'bordered',
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
      className={clsx(className, styles['root'])}
      {...rest}
      data-component="TextEditor"
    >
      <header className={styles['header']}>
        <span className={styles['path']}>{path}</span>
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
            aria-label={isSaving ? '저장하는 중' : '저장'}
            data-dirty={isDirty ? '' : undefined}
            className={styles['saveButton']}
            disabled={isSaving || !isDirty}
            onClick={() => onSave?.()}
            icon={() => (isSaving ? <Spinner size="small" srText="저장하는 중" /> : <Icon iconId="save" size="sm" />)}
          />
        )}
      </header>
      <div className={styles['bodyWrapper']}>
        <div ref={hostRef} className={styles['body']} />
        {loading ? (
          <div className={styles['loadingOverlay']}>
            <Spinner size="large" srText="읽는 중" />
          </div>
        ) : null}
      </div>
    </section>
  );
};


