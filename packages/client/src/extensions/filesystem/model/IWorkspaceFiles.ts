import { createToken } from '#core/di';
/**
 * 워크스페이스를 읽는 통로.
 *
 * 계약이 **화면이 필요한 것**으로 쓰여 있다 — 목록 하나, 내용 하나. `fs.Stats` 나 `Response`
 * 같은 것은 여기 없다. 그것들이 새면 이 Port 가 특정 전송 방식에 묶여, 감싼 의미가 사라진다.
 *
 * `list` 가 한 디렉터리만 주는 것도 계약이다 — 트리를 통째로 받으면 `node_modules` 까지 딸려
 * 온다. 화면은 펼친 폴더만 알면 되므로, 펼칠 때마다 그 디렉터리를 묻는다.
 *
 * 경로는 전부 **워크스페이스 루트 기준 상대 경로**다. 루트 자신은 `''`. 절대 경로를 쓰지 않는
 * 것은 서버가 어디에 뿌리내렸는지가 화면에 새지 않게 하기 위해서다.
 */

export type FileEntryType = 'dir' | 'file';

/**
 * 이름과 종류뿐이다 — 트리가 그리는 데 그 둘이면 된다.
 *
 * `size`/`mtime` 을 받던 시절이 있었는데 아무도 읽지 않았고, 서버는 그걸 채우려고 엔트리마다
 * `stat` 을 해야 했다. Port 가 요구하지 않으면 그 비용도 사라진다.
 *
 * `shared/files/type`의 같은 이름 타입과 모양이 같다 — 그래도 여기서 다시 선언한다. Port
 * 계약 파일(`I*.ts`)은 import 자체를 금지한다(`port-type-only`): 계약이 외부 모듈에서
 * 파생되면, 그 모듈이 바뀌는 순간 계약도 같이 바뀌어 Port를 둔 의미가 사라지기 때문이다
 * (`shared`도 예외가 아니다). 두 선언이 어긋나면 사람이 리뷰로 잡는다.
 */
export type FileEntry = {
  readonly name: string;
  readonly type: FileEntryType;
};

export type DirectoryListing = {
  readonly path: string;
  /** 상위 경로. 루트면 `null`. */
  readonly parent: string | null;
  readonly entries: readonly FileEntry[];
};

export type FileContent = {
  readonly path: string;
  /** 바이너리면 빈 문자열이다 — 화면은 `encoding` 을 보고 "볼 수 없는 파일"로 그린다. */
  readonly content: string;
  /** 상한을 넘어 앞부분만 왔다. */
  readonly truncated: boolean;
  readonly encoding: 'utf8' | 'binary';
};

export const WorkspaceFilesToken = createToken<IWorkspaceFiles>("workspaceFiles");
/** 워크스페이스 파일시스템에 대한 CRUD 조작을 감싸는 Port 계약. */
export interface IWorkspaceFiles {
  list(path: string): Promise<DirectoryListing>;
  read(path: string): Promise<FileContent>;
  /**
   * 이미 존재하는 파일을 통째로 덮어쓴다. 새 파일은 만들지 않는다 — 그건 `create` 의 몫이다.
   */
  write(path: string, content: string): Promise<void>;
  /** 새 파일 또는 빈 디렉터리를 만든다. 이미 있으면 실패한다. */
  create(path: string, type: FileEntryType): Promise<void>;
  /**
   * 파일이나 디렉터리를 옮긴다. 같은 부모 안에서 옮기면 이름변경이다 — 별도 메서드를 두지
   * 않는다. 목적지가 이미 있으면 실패한다(덮어쓰기가 아니다).
   */
  move(from: string, to: string): Promise<void>;
  /** 파일이나 디렉터리를 지운다. 디렉터리면 안까지 통째로 — 확인은 부르는 쪽의 몫이다. */
  remove(path: string): Promise<void>;
}
