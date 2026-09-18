import type { Disposable } from "#core/di";
/**
 * 화면이 그리는 트리.
 *
 * Model 의 평평한 표(`경로 → 자식`)를 여기서 **중첩 모양으로 접는다.** 화면 컴포넌트가 그 모양을
 * 원하기 때문이고, 그 변환은 표현의 일이지 상태의 일이 아니다.
 *
 * `type` 이 Model 의 `'dir'` 이 아니라 `'folder'` 인 것도 같은 이유다 — 화면 어휘로 바꾼다.
 * 아이콘은 여기에도 없다. 이름만 있으면 컴포넌트가 알아서 고른다.
 */

/** 화면이 그대로 쓰는 행 — Model의 `DirectoryNode`를 트리 컴포넌트의 어휘로 옮긴 것이다. */
export type FileTreeRow = {
  /** 워크스페이스 루트 기준 경로. 트리에서 유일하다. */
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "file";
  /** 자리 표시(아직 안 읽음·빈 폴더)라 누를 수 없다. */
  readonly disabled?: boolean;
  /** 자식을 읽어 오는 중 — 그 폴더 행 자체가 돈다. */
  readonly loading?: boolean;
  readonly children?: readonly FileTreeRow[];
};

/**
 * 루트가 지금 어디쯤인지.
 *
 * **비어 있는 것과 읽는 중인 것은 다르다.** 예전에는 둘을 구분하지 않고 "행이 없으면 읽는 중"
 * 이라고 적어서, 워크스페이스가 정말 비어 있으면 "읽는 중…" 이 영원히 남았다.
 */
export type DirectoryTreeStatus = "idle" | "loading" | "loaded" | "error";

/**
 * 우클릭 메뉴·삭제 확인이 다루는 최소 정보 — "무슨 행인가"만 있으면 된다.
 *
 * `FileTree`의 `FileTreeItem` 을 그대로 쓰지 않는다 — ViewModel 계약은 `component/`를 알 수 없는
 * 자리다(→ ADR 0007). `FileTreeItem` 은 이 모양을 이미 포함하므로 View가
 * 그대로 건네도 맞는다.
 */
export type ContextMenuTarget = {
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "file";
};

/**
 * 지금 이름을 편집 중인 것 — 기존 행의 이름 변경이거나, 아직 서버에 없는 새 파일/폴더다.
 * `rename`은 `rows` 안의 실존 행을 그대로 쓰고, `newFile`/`newFolder`는 `GHOST_ID`(`share.ts`)인
 * 임시 행을 그 부모의 자식 목록 끝에 끼워 넣어 표현한다(`#withEditingGhost`).
 */
export type EditingEntry =
  | { readonly kind: "rename"; readonly id: string; readonly initialValue: string }
  | { readonly kind: "newFile" | "newFolder"; readonly parentId: string };

declare module "#core/di" {
  /** `IDirectoryTreeViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.filesystem.directoryTreeViewModel": IDirectoryTreeViewModel;
  }
}
/**
 * `FileTree` 컴포넌트가 필요로 하는 상태·조작을 모두 노출하는 ViewModel 계약.
 *
 * 관찰 property는 전부 값 그대로다. 구현은 MobX observable 클래스고, 화면은 `observer`로 감싸 따라온다.
 */
export interface IDirectoryTreeViewModel extends Disposable {
  readonly rows: readonly FileTreeRow[];
  readonly expandedIds: readonly string[];
  /** 선택된 경로들(다중선택). 빈 배열이 "선택 없음"이다. */
  readonly selectedIds: readonly string[];
  readonly status: DirectoryTreeStatus;
  /** 루트를 읽지 못했을 때의 이유. 트리 자체가 뜨지 않는 유일한 경우다. */
  readonly failure: string | null;

  /** 화면이 처음 뜰 때 한 번. */
  start(): void;
  setFolderExpanded(id: string, expanded: boolean): void;
  setSelection(ids: readonly string[]): void;
  /** `rows`(중첩 트리) 안에서 id로 행을 찾는다 — 컨텍스트 메뉴 대상 계산 등에 쓴다. */
  findRow(id: string): FileTreeRow | undefined;

  /**
   * `parentId` 안에 새 파일/폴더를 만든다. 화면 어휘(`'folder'`)를 Model 어휘(`'dir'`)로 여기서
   * 바꾼다.
   *
   * 넷 다 실패를 던진다(`void` 로 삼키지 않는다) — 호출부(`confirmPrompt`/`confirmDelete`)가
   * 실패를 `failure`로 옮겨 담는다. 직접 부르는 테스트는 여전히 거절을 그대로 받는다.
   */
  createEntry(parentId: string, name: string, type: "folder" | "file"): Promise<void>;
  renameEntry(id: string, newName: string): Promise<void>;
  removeEntry(id: string): Promise<void>;
  /**
   * 여러 항목을 한꺼번에 지운다. 후손(선택된 폴더 안의 선택된 파일)을 먼저 걸러낸다 — 부모를
   * 지우면 자식은 이미 사라지므로, 자식을 따로 또 지우려 들면 404가 난다. 병렬이 아니라 순차로
   * 지운다 — 병렬로 쏘면 Model이 부모 디렉터리를 다시 읽는 시점이 서로를 덮어써 목록이 어긋난다.
   */
  removeEntries(ids: readonly string[]): Promise<void>;
  /** 드래그앤드롭으로 다른 폴더에 옮긴다. 옮긴 뒤의 전체 경로를 돌려준다(열린 탭 재배정용). */
  moveEntry(id: string, toParentId: string): Promise<string>;

  /** 파일을 미리보기 탭으로 연다 — `arka.workbench.open` 명령을 부른다. 행 클릭이 부른다. */
  openFile(path: string): void;
  /** 파일을 고정 탭으로 연다 — 이미 미리보기로 열려 있으면 고정된다. 행 더블클릭이 부른다. */
  pinFile(path: string): void;
  /** 파일이 옮겨졌다 — 그 경로를 보던 탭이 새 경로를 따라가게 `arka.workbench.retargetTabs`를 부른다. */
  retargetTabs(oldPath: string, newPath: string): void;

  /** 펼친 디렉터리를 외부 변경에 대해 감시하기 시작한다. */
  startWatching(): void;
  /** 감시를 멈춘다. */
  stopWatching(): void;

  /**
   * 지금 우클릭된 행. `null`은 "빈 곳을 우클릭했다"(루트에 새로 만드는 메뉴만 뜬다). View는 이
   * 값을 결정하지 않는다 — 우클릭 이벤트가 일어났다는 사실만 `setContextTarget`으로 전한다.
   */
  readonly contextTarget: ContextMenuTarget | null;
  /**
   * 메뉴가 실제로 다루는 대상 전체 — `contextTarget`이 지금 선택 안에 있으면 선택 전체, 아니면
   * 그 행 하나다.
   */
  readonly contextTargets: readonly ContextMenuTarget[];
  setContextTarget(target: ContextMenuTarget | null): void;

  /**
   * 지금 이름을 편집 중인 행 — `rows`(중첩 트리) 안의 실존 id이거나, 새로 만드는 중이면 아직
   * 서버에 없는 임시 행("유령 행")의 id다. `FileTree`의 `editingId`에 그대로 넘긴다.
   */
  readonly editingId: string | undefined;
  /** `contextTarget` 기준으로 새 파일 이름을 묻는다 — `rows`에 이름이 빈 유령 행을 끼워 넣고
   *  그 행을 바로 편집 상태로 연다(모달 없이 인라인으로). */
  requestNewFile(): void;
  /** `contextTarget` 기준으로 새 폴더 이름을 묻는다. */
  requestNewFolder(): void;
  /** `contextTarget` 하나의 이름 변경을 묻는다 — `contextTarget`이 없으면 아무 일도 하지 않는다. */
  requestRename(): void;
  /** 편집을 확정한다 — 지금 무엇을 편집 중이었는지에 따라 `createEntry`/`renameEntry`를 부르고,
   *  실패는 `failure`로 옮겨 담는다(던지지 않는다 — 확정 흐름은 위에서 기다릴 곳이 없다). 빈
   *  값이면 아무것도 만들거나 바꾸지 않고 그냥 닫는다. */
  onEditCommit(value: string): void;
  /** 편집을 취소한다 — 유령 행이면 사라지고, 이름 변경이면 그대로 남는다. */
  onEditCancel(): void;

  /** 삭제 확인 다이얼로그가 띄운 대상들. 빈 배열이면 다이얼로그가 닫혀 있다. */
  readonly deleteTargets: readonly ContextMenuTarget[];
  /** `contextTargets`를 그대로 `deleteTargets`로 옮겨 확인 다이얼로그를 연다. */
  requestDelete(): void;
  confirmDelete(): void;
  cancelDelete(): void;

  /** 마지막으로 실패한 조작의 이유. `dismissFailure`로 지운다(`Dialog`의 확인 버튼이 부른다). */
  readonly failureNotice: string | null;
  dismissFailureNotice(): void;
}
