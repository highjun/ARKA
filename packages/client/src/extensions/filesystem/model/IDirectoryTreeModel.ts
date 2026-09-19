import type { Disposable } from "#core/di";
import type { FileEntry, FileEntryType } from "../model/IWorkspaceFiles";

/**
 * 워크스페이스 트리의 상태.
 *
 * **디렉터리별로 따로 담는다.** 중첩된 트리 하나로 들고 있으면 자식을 채워 넣을 때마다 위에서
 * 아래까지 복사해야 하고, 깊어질수록 그 비용이 는다. 평평한 표에 `경로 → 자식` 으로 두면 갱신이
 * 그 칸 하나로 끝난다 — 화면이 쓰는 중첩 모양은 ViewModel 이 만든다.
 *
 * 아이콘이 여기 없는 것은 그것이 표현이기 때문이다. Model 은 `IconId` 를 알 수 없다.
 */

/** `idle`은 아직 한 번도 안 읽은 폴더다 — 펼치면 `loading`으로 간다. */
type DirectoryStatus = "idle" | "loading" | "loaded" | "error";

/** 폴더 하나의 읽기 상태. 자식 목록은 경로로만 가리키고 중첩하지 않는다. */
type DirectoryNode = {
  readonly status: DirectoryStatus;
  readonly entries: readonly FileEntry[];
  /** 실패했을 때 사람이 읽을 수 있는 이유. */
  readonly failure: string | null;
};

/** 경로(루트는 `''`) → 그 디렉터리의 상태. */
export type DirectoryMap = Readonly<Record<string, DirectoryNode>>;

declare module "#core/di" {
  /** `IDirectoryTreeModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.filesystem.directoryTreeModel": IDirectoryTreeModel;
  }
}
/** 디렉터리 트리 상태를 소유하고 파일시스템 조작을 제공하는 Model 계약. */
export interface IDirectoryTreeModel {
  readonly directories: DirectoryMap;
  /** 펼쳐진 디렉터리 경로들. */
  readonly expanded: readonly string[];
  /** 선택된 경로들(다중선택). 빈 배열이 "선택 없음"이다. */
  readonly selected: readonly string[];

  /** 루트를 읽는다. 화면이 처음 뜰 때 한 번. */
  load(): Promise<void>;
  /**
   * 펼침을 **명시적으로** 정한다. 처음 펼치는 디렉터리는 그때 읽는다.
   *
   * 뒤집기(toggle)가 아닌 이유 — 화면에서 클릭과 키보드(→←)가 같은 동작을 서로 다른 경로로
   * 알려오는데, 뒤집기면 둘이 겹칠 때 서로를 상쇄한다. "이 상태로 만들어라"는 몇 번을 받아도
   * 결과가 같다.
   */
  setExpanded(path: string, expanded: boolean): Promise<void>;
  setSelection(paths: readonly string[]): void;

  /** `parentPath` 안에 새 파일/디렉터리를 만들고, 그 디렉터리를 다시 읽는다. */
  createEntry(parentPath: string, name: string, type: FileEntryType): Promise<void>;
  /** 같은 부모 안에서 이름을 바꾼다. 부모 디렉터리를 다시 읽는다. */
  renameEntry(path: string, newName: string): Promise<void>;
  /** 파일이나 디렉터리를 지운다. 부모 디렉터리를 다시 읽는다. */
  removeEntry(path: string): Promise<void>;
  /**
   * 드래그앤드롭으로 다른 폴더에 옮긴다 — 이름은 그대로, 부모만 바뀐다(이름까지 바꾸는 것은
   * `renameEntry` 의 몫이다). 옛 부모·새 부모 두 디렉터리를 다시 읽는다. 옮긴 뒤의 전체 경로를
   * 돌려준다 — 부르는 쪽이 열린 탭·편집 버퍼를 새 경로로 재배정해야 하기 때문이다.
   */
  moveToFolder(path: string, toParentPath: string): Promise<string>;

  /**
   * 지금까지 펼친 디렉터리(+ 루트)를 외부 변경에 대해 감시하기 시작한다. `setExpanded` 로 펼침이
   * 바뀔 때마다 감시 대상도 따라 바뀐다 — 부르는 쪽이 다시 부를 필요는 없다.
   */
  startWatching(): void;
  /** 감시를 멈춘다. 다시 `startWatching` 을 부르기 전까지는 외부 변경에 반응하지 않는다. */
  stopWatching(): void;

  /** 상태가 바뀔 때마다 부른다. ViewModel이 이걸 받아 자기 atom을 갱신한다. */
  onDidChange(listener: () => void): Disposable;
}
