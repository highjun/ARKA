import type { Disposable } from "#core/di";
/**
 * 화면이 그리는 파일 하나.
 *
 * 상태 여럿(읽는 중·바이너리·잘림·실패·저장 중·저장 실패)을 **`notice` 한 줄과 플래그 몇 개로
 * 접는다**. 화면은 본문·그 위에 띄울 안내·편집 가능 여부만 있으면 되고, 어떤 조합이 어떤 문장이
 * 되는지는 표현의 규칙이라 여기에 둔다.
 *
 * 경로로 담는 이유는 탭이 여럿일 수 있어서다 — 어느 탭이 어느 파일인지는 Shell 이 안다.
 */

/** 화면이 그대로 쓰는 모양 — 상태가 불리언으로 펴져 있다. */
export type FileRow = {
  readonly content: string;
  /**
   * 본문 위에 띄울 안내. 평범하게 읽혔고 저장할 것도 없으면 `null`.
   *
   * 읽는 중·저장 중은 여기 담기지 않는다 — 그 둘은 각각 `loading`·`isSaving` 플래그로 화면이
   * 직접 표현한다(에디터 오버레이 스피너, 저장 버튼 회전) — Banner 문구가 아니라.
   */
  readonly notice: string | null;
  /** `false` 면 편집·저장이 열린다. 읽는 중·실패·바이너리·잘림일 때는 항상 `true` 다. */
  readonly readOnly: boolean;
  /** 저장하지 않은 변경이 있다 — 저장 버튼이 눌리는 조건. */
  readonly isDirty: boolean;
  /** 저장이 진행 중이다. */
  readonly isSaving: boolean;
  /** 파일을 읽는 중이다 — 에디터 본문 위에 오버레이 스피너를 띄우는 조건. */
  readonly loading: boolean;
};

/** 탭 id를 키로 한다 — 같은 파일을 두 탭으로 열면 두 항목이다. */
export type FileRowMap = Readonly<Record<string, FileRow>>;

declare module "#core/di" {
  /** `IFileContentViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.filesystem.fileContentViewModel": IFileContentViewModel;
  }
}
/**
 * 화면(에디터)이 필요로 하는 파일 상태·조작을 노출하는 ViewModel 계약.
 *
 * atom은 React 경계를 넘지 않는다((C), 2026-09-05) — `rows`는 값 그대로다. 구현은
 * `ViewModelBase.observe()`로 atom을 감싸 값을 getter로 노출한다.
 */
export interface IFileContentViewModel {
  readonly rows: FileRowMap;
  /**
   * `rows`가 바뀌었음을 알린다 — 화면 밖에서 이 값을 지켜봐야 하는 쪽(예: 탭의 dirty 표시)이
   * 쓴다. `ViewModelBase.subscribe`는 React 배선이라 계약에 두지 않고, 이 메서드로 감싼다.
   */
  onDidChange(listener: () => void): Disposable;
  openFile(path: string): void;
  /** 타이핑할 때마다 부른다 — 로컬 버퍼만 바뀐다. */
  editFile(path: string, content: string): void;
  /** 지금 버퍼를 서버에 쓴다. */
  saveFile(path: string): void;
  /** 열려 있던 파일이 옮겨지거나 이름이 바뀌었다 — 편집 중이던 내용까지 새 경로로 따라간다. */
  retargetOpenFile(oldPrefix: string, newPrefix: string): void;

  /** 열린 파일들을 외부 변경에 대해 감시하기 시작한다. */
  startWatching(): void;
  /** 감시를 멈춘다. */
  stopWatching(): void;
}
