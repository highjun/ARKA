import { describe, expect, it } from 'vitest';
import type { IMarkdownSource } from './IMarkdownSource';

/** 스위트가 파일을 바꿔 감시자를 깨울 수 있어야 한다 — 그게 이 계약의 절반이다. */
export type MarkdownSourceHarness = {
  readonly source: IMarkdownSource;
  readonly write: (path: string, content: string) => void | Promise<void>;
};

/** `IMarkdownSource`를 구현한 모든 것이 통과해야 하는 스위트. `setup`은 주어진 파일들을 담은 통로를 준다. */
export const testMarkdownSourceContract = (
  name: string,
  setup: (files: Readonly<Record<string, string>>) => MarkdownSourceHarness | Promise<MarkdownSourceHarness>,
): void => {
  describe(`IMarkdownSource: ${name}`, () => {
    it('있는 파일의 내용을 준다', async () => {
      const { source } = await setup({ 'a.md': '# 제목' });
      expect(await source.read('a.md')).toEqual({ content: '# 제목', truncated: false });
    });

    // TSDoc의 `@throws`는 적어두기만 하면 주장일 뿐이다 — 실제로 던지는지 본다.
    it('읽지 못하면 던진다', async () => {
      const { source } = await setup({});
      await expect(source.read('없다.md')).rejects.toThrow();
    });

    it('파일이 바뀌면 감시자가 불린다', async () => {
      const { source, write } = await setup({ 'a.md': '처음' });
      let called = 0;
      source.watch('a.md', () => {
        called += 1;
      });
      await write('a.md', '다음');
      expect(called).toBeGreaterThan(0);
    });

    it('해지하면 더는 부르지 않는다', async () => {
      const { source, write } = await setup({ 'a.md': '처음' });
      let called = 0;
      const stop = source.watch('a.md', () => {
        called += 1;
      });
      stop();
      await write('a.md', '다음');
      expect(called).toBe(0);
    });
  });
};
