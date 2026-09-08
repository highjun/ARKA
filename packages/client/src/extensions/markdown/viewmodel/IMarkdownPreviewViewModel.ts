import { createToken } from '#core/di';

export type PreviewState = {
  readonly loading: boolean;
  readonly markdown: string;
  readonly truncated: boolean;
  readonly failure: string | null;
};

/** 미리보기 탭의 kind와 id 규약. 조립부의 `TabContentRegistry` 등록과 같아야 한다. */
export const PREVIEW_TAB_KIND = 'markdownPreview';
export const previewTabIdOf = (path: string): string => `preview:${path}`;
export const pathOfPreviewTab = (tabId: string): string | null => (tabId.startsWith('preview:') ? tabId.slice('preview:'.length) : null);

export const MarkdownPreviewViewModelToken = createToken<IMarkdownPreviewViewModel>('markdownPreviewViewModel');
/**
 * 미리보기 탭의 화면 상태. "마크다운 미리보기 열기" 커맨드(Ctrl+Shift+V)도 여기서 등록한다 — 지금 보고
 * 있는 파일이 무엇인지와 탭을 여는 방법은 조립부가 함수로 넣어 준다(익스텐션은 셸을 모른다).
 */
export interface IMarkdownPreviewViewModel {
  /** 탭이 렌더마다 부른다 — 멱등. */
  openPreview(tabId: string): void;
  previewOf(tabId: string): PreviewState;
  /** 지금 활성 파일의 미리보기를 연다. 활성 파일이 `.md`가 아니면 아무 일도 없다. */
  openActivePreview(): void;
}
