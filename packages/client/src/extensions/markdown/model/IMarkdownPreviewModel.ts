import { createToken, type Disposable } from '#core/di';

export type PreviewStatus = 'loading' | 'loaded' | 'error';

export type Preview = {
  readonly path: string;
  readonly status: PreviewStatus;
  /** 마크다운 원문. 렌더는 표현의 몫이다(컴포넌트). */
  readonly markdown: string;
  readonly truncated: boolean;
  readonly failure: string | null;
};

export const MarkdownPreviewModelToken = createToken<IMarkdownPreviewModel>('markdownPreviewModel');
/**
 * 열어 둔 미리보기들의 원문을 소유한다. 파일이 바뀌면 다시 읽는다 — 저장된 내용을 따른다(편집 중인
 * 버퍼가 아니다). VSCode도 기본은 그렇다.
 */
export interface IMarkdownPreviewModel {
  readonly previews: Readonly<Record<string, Preview>>;
  /** 읽고 감시를 시작한다. 이미 열려 있으면 아무 일도 없다. */
  open(path: string): void;
  close(path: string): void;
  onDidChange(listener: () => void): Disposable;
}
