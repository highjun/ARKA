import { beforeEach, describe, expect, it } from 'vitest';
import type { IGitService } from './IGitService';

/** 구현마다 다른 준비 절차를 감싼다 — 스위트는 이 모양만 알면 된다. */
export type GitSetup = {
  readonly service: IGitService;
  /** 작업 트리에 파일을 쓴다. 커밋되지 않은 새 파일이면 추적 안 됨. */
  write(path: string, content: string): Promise<void>;
};

/**
 * `IGitService`를 구현한 모든 것이 통과해야 하는 스위트. `setup`은 줄바꿈 하나로 끝나는 `a.txt`가 커밋된
 * 저장소를 준다.
 */
export const testGitServiceContract = (name: string, setup: () => GitSetup | Promise<GitSetup>): void => {
  describe(`IGitService: ${name}`, () => {
    let s: GitSetup;
    beforeEach(async () => {
      s = await setup();
    });

    it('깨끗한 저장소는 브랜치가 있고 변경이 없다', async () => {
      const result = await s.service.status();
      expect(result.repository).toBe(true);
      expect(result.branch).toBe('main');
      expect(result.files).toEqual([]);
    });

    it('수정과 새 파일이 경로순으로 보인다', async () => {
      await s.write('b.txt', 'new\n');
      await s.write('a.txt', 'two\n');
      expect((await s.service.status()).files).toEqual([
        { path: 'a.txt', staged: null, unstaged: 'modified' },
        { path: 'b.txt', staged: null, unstaged: 'untracked' },
      ]);
    });

    it('diff는 작업 트리·스테이지·추적 안 됨을 각각 보여 준다', async () => {
      await s.write('a.txt', 'two\n');
      await s.write('b.txt', 'new\n');
      expect(await s.service.diff('a.txt', false)).toContain('-one');
      expect(await s.service.diff('a.txt', true)).toBe('');
      expect(await s.service.diff('b.txt', false)).toContain('+new');
    });

    it('스테이지·해제·커밋', async () => {
      await s.write('a.txt', 'two\n');
      await s.write('b.txt', 'new\n');
      await s.service.stage(['a.txt', 'b.txt']);
      expect((await s.service.status()).files.map((f) => f.staged)).toEqual(['modified', 'added']);
      await s.service.unstage(['b.txt']);
      expect((await s.service.status()).files.find((f) => f.path === 'b.txt')).toMatchObject({ staged: null, unstaged: 'untracked' });
      const hash = await s.service.commit('second');
      expect(hash).toMatch(/^[0-9a-f]{40}$/u);
      expect((await s.service.status()).files).toEqual([{ path: 'b.txt', staged: null, unstaged: 'untracked' }]);
    });

    it('스테이지된 것이 없으면 커밋이 던진다', async () => {
      await expect(s.service.commit('x')).rejects.toThrow();
    });
  });
};
