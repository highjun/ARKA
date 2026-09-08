import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.use({ gfm: true, breaks: false });

/**
 * 마크다운 → 안전한 HTML. 워크스페이스의 파일은 신뢰할 수 없는 입력이다(에이전트가 쓴 것일 수도,
 * 클론한 저장소일 수도) — 스크립트·이벤트 핸들러·`javascript:` 링크는 DOMPurify가 걷어낸다.
 */
export const renderMarkdown = (markdown: string): string => {
  const html = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
};
