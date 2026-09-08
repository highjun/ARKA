import { describe, expect, it } from 'vitest';
import { MarkdownPreviewModel } from './MarkdownPreviewModel';
import { MockMarkdownSource } from './MockMarkdownSource';

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('MarkdownPreviewModel', () => {
  it('열면 읽고, 파일이 바뀌면 다시 읽는다', async () => {
    const source = new MockMarkdownSource({ 'a.md': '# 하나' });
    const model = new MarkdownPreviewModel({ source });
    model.open('a.md');
    expect(model.previews['a.md']?.status).toBe('loading');
    await settled();
    expect(model.previews['a.md']).toMatchObject({ status: 'loaded', markdown: '# 하나' });
    source.write('a.md', '# 둘');
    await settled();
    expect(model.previews['a.md']?.markdown).toBe('# 둘');
  });

  it('open은 멱등이고 close하면 감시가 끊긴다', async () => {
    const source = new MockMarkdownSource({ 'a.md': 'x' });
    const model = new MarkdownPreviewModel({ source });
    model.open('a.md');
    model.open('a.md');
    await settled();
    model.close('a.md');
    expect(model.previews['a.md']).toBeUndefined();
    source.write('a.md', 'y');
    await settled();
    expect(model.previews['a.md']).toBeUndefined();
  });

  it('읽기 실패는 error와 사유로 남는다', async () => {
    const model = new MarkdownPreviewModel({ source: new MockMarkdownSource() });
    model.open('nope.md');
    await settled();
    expect(model.previews['nope.md']).toMatchObject({ status: 'error', failure: 'no such file: nope.md' });
  });
});
