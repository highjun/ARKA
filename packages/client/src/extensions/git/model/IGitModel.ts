import { createToken, type Disposable } from '#core/di';
import type { GitFileStatus } from '#contracts';

export type GitLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type DiffEntry = {
  readonly status: 'loading' | 'loaded' | 'error';
  readonly text: string;
  readonly failure: string | null;
};

/** diff 캐시의 키 — `staged:path` 또는 `wt:path`. 탭 id로도 쓴다. */
export const diffKeyOf = (path: string, staged: boolean): string => `${staged ? 'staged' : 'wt'}:${path}`;

export const GitModelToken = createToken<IGitModel>('gitModel');
/**
 * 워크스페이스의 Git 상태를 소유한다. VSCode의 `Repository` 모델에 해당한다.
 *
 * 상태는 요청할 때만 새로 읽는다(`refresh`). 스테이지·커밋 뒤에는 스스로 다시 읽는다.
 */
export interface IGitModel {
  readonly repository: boolean;
  readonly branch: string | null;
  readonly files: readonly GitFileStatus[];
  readonly status: GitLoadStatus;
  readonly failure: string | null;
  /** 읽어 둔 diff. 키는 `diffKeyOf`. */
  readonly diffs: Readonly<Record<string, DiffEntry>>;

  refresh(): Promise<void>;
  stage(paths: readonly string[]): Promise<void>;
  unstage(paths: readonly string[]): Promise<void>;
  /** 성공하면 해시, 실패하면 `failure`에 남기고 `null`. */
  commit(message: string): Promise<string | null>;
  /** diff를 읽는다. 이미 읽었어도 다시 읽는다 — 파일이 바뀌었을 수 있다. */
  loadDiff(path: string, staged: boolean): Promise<void>;
  onDidChange(listener: () => void): Disposable;
}
