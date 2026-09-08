import { beforeEach, describe, expect, it } from 'vitest';
import type { ISearchService } from './ISearchService';

export type SearchSetup = {
  readonly service: ISearchService;
  /** 검색 대상 파일을 심는다. */
  seed(files: Readonly<Record<string, string>>): Promise<void>;
};

/** `ISearchService`를 구현한 모든 것이 통과해야 하는 스위트. */
export const testSearchServiceContract = (name: string, setup: () => SearchSetup | Promise<SearchSetup>): void => {
  describe(`ISearchService: ${name}`, () => {
    let s: SearchSetup;
    beforeEach(async () => {
      s = await setup();
      await s.seed({ 'README.md': '# ADE\nAgent Development\nagent again\n', 'src/main.ts': "export const agent = 1;\nconst x = 'Agent';\n" });
    });

    it('대소문자 무시로 경로순·줄순으로 찾고 줄·열은 1부터다', async () => {
      const { matches, truncated } = await s.service.search({ query: 'agent', path: '', regex: false, caseSensitive: false });
      expect(matches.map((m) => [m.path, m.line, m.column])).toEqual([
        ['README.md', 2, 1],
        ['README.md', 3, 1],
        ['src/main.ts', 1, 14],
        ['src/main.ts', 2, 12],
      ]);
      expect(matches[0]?.preview).toBe('Agent Development');
      expect(truncated).toBe(false);
    });

    it('대소문자를 구분할 수 있다', async () => {
      const { matches } = await s.service.search({ query: 'Agent', path: '', regex: false, caseSensitive: true });
      expect(matches.map((m) => m.path)).toEqual(['README.md', 'src/main.ts']);
    });

    it('정규식을 쓸 수 있고 리터럴은 이스케이프된다', async () => {
      expect((await s.service.search({ query: 'ag.nt ag', path: '', regex: true, caseSensitive: false })).matches).toHaveLength(1);
      expect((await s.service.search({ query: 'ag.nt ag', path: '', regex: false, caseSensitive: false })).matches).toHaveLength(0);
    });

    it('경로로 좁힌다', async () => {
      const { matches } = await s.service.search({ query: 'agent', path: 'src', regex: false, caseSensitive: false });
      expect(matches.every((m) => m.path.startsWith('src/'))).toBe(true);
      expect(matches).toHaveLength(2);
    });

    it('없으면 빈 결과다', async () => {
      const { matches, filesScanned } = await s.service.search({ query: 'zzz-none', path: '', regex: false, caseSensitive: false });
      expect(matches).toEqual([]);
      expect(filesScanned).toBeGreaterThan(0);
    });
  });
};
