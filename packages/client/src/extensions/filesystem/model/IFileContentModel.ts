import { createToken, type Disposable } from '#core/di';

/**
 * 열린 파일들의 내용.
 *
 * 경로별로 담는다 — 탭이 여럿이면 파일도 여럿이고, 탭을 오갈 때마다 다시 읽지 않기 위해서다.
 * 무엇을 열지(탭)는 Shell 의 일이고, 여기는 **연 것의 내용만** 안다.
 */

/** 읽기 상태다 — 저장은 `SaveStatus`가 따로 든다. */
type FileStatus = 'loading' | 'loaded' | 'error';
/** 저장에 성공하면 `idle`로 돌아온다 — `saved` 같은 상태를 따로 두지 않는다. */
type SaveStatus = 'idle' | 'saving' | 'error';

/** 열린 파일 하나. 편집 중인 내용과 디스크의 내용이 함께 있다. */
export type OpenFile = {
  readonly path: string;
  readonly status: FileStatus;
  /**
   * 서버가 마지막으로 알려준 내용 — 처음 읽었을 때, 그리고 저장이 성공할 때마다 갱신된다.
   * `content` 와 다르면 **저장하지 않은 변경**이 있다는 뜻이다(저장 여부를 따로 든 플래그가 아니라
   * 이 둘의 차이로 판정한다 — 두 소스가 어긋나는 사고를 원천적으로 없앤다).
   */
  readonly savedContent: string;
  /** 화면이 지금 보여주는 내용. 읽기 직후에는 `savedContent` 와 같고, 편집하면 갈라진다. */
  readonly content: string;
  /** 상한을 넘어 앞부분만 왔다. **참이면 편집·저장을 막는다** — 잘린 내용을 다시 쓰면 뒷부분이
   *  통째로 사라진다. */
  readonly truncated: boolean;
  /** 텍스트가 아니라 화면이 그릴 수 없다. */
  readonly binary: boolean;
  /** 읽기 실패 이유. */
  readonly failure: string | null;
  readonly saveStatus: SaveStatus;
  /** 저장 실패 이유. 읽기 실패(`failure`)와 다른 축이라 따로 둔다 — 저장이 실패해도 화면에 보이는
   *  내용은 그대로 남아야 한다. */
  readonly saveFailure: string | null;
};

/** 경로 → 그 파일의 상태. */
export type OpenFileMap = Readonly<Record<string, OpenFile>>;

export const FileContentModelToken = createToken<IFileContentModel>("fileContentModel");
/** 열린 파일의 내용을 읽고·편집하고·저장하는 Model 계약. */
export interface IFileContentModel {
  readonly files: OpenFileMap;
  /** 아직 읽지 않았으면 읽는다. 이미 있으면 아무 일도 하지 않는다. */
  open(path: string): Promise<void>;
  /** 서버 쪽이 바뀌었을 때 다시 읽는다. */
  reload(path: string): Promise<void>;
  close(path: string): void;
  /**
   * 편집 버퍼를 갱신한다 — 서버에는 아무것도 하지 않는다.
   *
   * 잘렸거나(`truncated`) 바이너리거나 아직 안 읽힌 파일에는 아무 일도 하지 않는다 — 그런 파일을
   * 편집한 것을 저장하면 데이터가 상한다. View 가 `readOnly` 로 이미 막지만, 여기서도 막는다.
   */
  edit(path: string, content: string): void;
  /**
   * 지금 버퍼(`content`)를 서버에 쓴다.
   *
   * 저장할 것이 없거나(버퍼가 이미 서버 내용과 같다), 이미 저장 중이거나, 편집이 애초에 막힌
   * 파일이면 아무 일도 하지 않는다.
   */
  save(path: string): Promise<void>;
  /**
   * 열려 있던 파일이 옮겨지거나 이름이 바뀌었다 — `oldPrefix` 로 시작하는 모든 키(폴더 이동이면
   * 그 하위 전부)를 `newPrefix` 로 다시 붙인다. **편집 중이던 내용(`content`)까지 그대로
   * 따라간다** — 여기서 안 하면 미저장 편집이 옛 경로 아래 고아로 남고, 새 경로를 열면 디스크에서
   * 새로 읽어 그 편집을 조용히 잃는다.
   */
  retargetOpenFile(oldPrefix: string, newPrefix: string): void;

  /**
   * 지금 열려 있는 파일들을 외부 변경에 대해 감시하기 시작한다. `open`/`close` 로 열린 파일
   * 집합이 바뀔 때마다 감시 대상도 따라 바뀐다. **편집 중(dirty)인 파일은 외부 변경이 와도 자동
   * 리로드를 건너뛴다** — 사용자의 미저장 편집을 함부로 덮어쓰지 않기 위해서다.
   */
  startWatching(): void;
  /** 감시를 멈춘다. */
  stopWatching(): void;

  /** 상태가 바뀔 때마다 부른다. ViewModel이 이걸 받아 자기 atom을 갱신한다. */
  onDidChange(listener: () => void): Disposable;

}
