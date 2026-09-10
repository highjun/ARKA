import type { GitFileStatus, GitStatusResponse } from '#contracts';
import type { IGitService } from './IGitService';

type Entry = { readonly committed: string | null; readonly index: string | null; readonly worktree: string | null };

/**
 * 메모리 안의 저장소 — 경로마다 커밋된 내용·인덱스 내용·작업 트리 내용을 든다. 상태는 셋의 차이로 만든다.
 * 실물과 같은 스위트(`gitService.contract.ts`)를 통과한다.
 */
export class MockGitService implements IGitService {
  readonly #entries = new Map<string, Entry>();
  #commits = 0;
  repository = true;
  branch: string | null = 'main';

  /** 작업 트리에 쓴다(없던 파일이면 추적 안 됨). */
  write(path: string, content: string): void {
    const entry = this.#entries.get(path) ?? { committed: null, index: null, worktree: null };
    this.#entries.set(path, { ...entry, worktree: content });
  }

  /** 작업 트리에서 지운다. */
  remove(path: string): void {
    const entry = this.#entries.get(path);
    if (entry !== undefined) this.#entries.set(path, { ...entry, worktree: null });
  }

  /** 심어 둔 상태를 그대로 돌려준다 — 실제 git을 부르지 않는다. */
  status(): Promise<GitStatusResponse> {
    if (!this.repository) return Promise.resolve({ repository: false, branch: null, files: [] });
    const files: GitFileStatus[] = [];
    for (const [path, { committed, index, worktree }] of [...this.#entries].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
      const staged = index === committed ? null : index === null ? 'deleted' : committed === null ? 'added' : 'modified';
      const base = index ?? committed;
      const unstaged = worktree === base ? null : worktree === null ? 'deleted' : base === null ? 'untracked' : 'modified';
      if (staged === null && unstaged === null) continue;
      files.push({ path, staged, unstaged });
    }
    return Promise.resolve({ repository: true, branch: this.branch, files });
  }

  /** 심어 둔 diff가 없으면 빈 문자열이다 — 던지지 않는다. */
  diff(path: string, staged: boolean): Promise<string> {
    const entry = this.#entries.get(path);
    if (entry === undefined) return Promise.resolve('');
    const [before, after] = staged ? [entry.committed, entry.index] : [entry.index ?? entry.committed, entry.worktree];
    if (before === after) return Promise.resolve('');
    const minus = before === null ? '' : `-${before.trimEnd()}\n`;
    const plus = after === null ? '' : `+${after.trimEnd()}\n`;
    return Promise.resolve(`--- a/${path}\n+++ b/${path}\n@@ @@\n${minus}${plus}`);
  }

  /** 목록에 없는 경로는 조용히 무시한다. */
  stage(paths: readonly string[]): Promise<void> {
    for (const path of paths) {
      const entry = this.#entries.get(path);
      if (entry !== undefined) this.#entries.set(path, { ...entry, index: entry.worktree });
    }
    return Promise.resolve();
  }

  /** 목록에 없는 경로는 조용히 무시한다. */
  unstage(paths: readonly string[]): Promise<void> {
    for (const path of paths) {
      const entry = this.#entries.get(path);
      if (entry !== undefined) this.#entries.set(path, { ...entry, index: entry.committed });
    }
    return Promise.resolve();
  }

  /** 스테이지가 비어 있으면 던진다 — 실물과 같은 실패 경로다. */
  commit(message: string): Promise<string> {
    if (message.trim() === '') return Promise.reject(new Error('커밋 메시지가 비었다.'));
    const staged = [...this.#entries.values()].some((e) => e.index !== e.committed);
    if (!staged) return Promise.reject(new Error('스테이지된 변경이 없다.'));
    for (const [path, entry] of this.#entries) {
      if (entry.index === null && entry.worktree === null) this.#entries.delete(path);
      else this.#entries.set(path, { ...entry, committed: entry.index });
    }
    this.#commits += 1;
    return Promise.resolve(String(this.#commits).padStart(40, '0'));
  }
}
