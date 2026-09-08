import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown', () => {
  it('GFM을 HTML로 바꾼다', () => {
    const html = renderMarkdown('# 제목\n\n- [x] 할 일\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<h1>제목</h1>');
    expect(html).toContain('<table>');
    expect(html).toContain('type="checkbox"');
  });

  it('스크립트와 이벤트 핸들러, javascript: 링크를 걷어낸다', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).toContain('<a');
    expect(html).not.toMatch(/href="javascript/u);
  });
});
