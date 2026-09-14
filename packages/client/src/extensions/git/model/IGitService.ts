import { createToken } from '#core/di';
import type { GitStatusResponse } from '#contracts';


export const GitServiceToken = createToken<IGitService>('gitService');
/** 서버의 `/api/git/*` 통로. 실패는 던진다 — 메시지는 사람이 읽을 수 있는 말(git의 stderr 포함). */
export interface IGitService {
  status(): Promise<GitStatusResponse>;
  /** unified diff 원문. 변화가 없으면 빈 문자열. */
  diff(path: string, staged: boolean): Promise<string>;
  stage(paths: readonly string[]): Promise<void>;
  unstage(paths: readonly string[]): Promise<void>;
  /** 커밋 해시를 돌려준다. 스테이지된 것이 없으면 던진다. */
  commit(message: string): Promise<string>;
}
