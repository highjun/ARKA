/** 화면이 그대로 쓰는 모양 — `status`가 `loading` 불리언으로 펴져 있다. */
export type PreviewState = {
  readonly loading: boolean;
  readonly markdown: string;
  readonly truncated: boolean;
  readonly failure: string | null;
};

declare module "#core/di" {
  /** `IMarkdownPreviewViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.markdown.previewViewModel": IMarkdownPreviewViewModel;
  }
}
/**
 * 미리보기 탭의 화면 상태. "마크다운 미리보기 열기" 커맨드(Ctrl+Shift+V)도 여기서 등록한다 — 지금 보고
 * 있는 파일은 `tab.active.uri` 문맥으로 읽고, 탭은 `arka.workbench.open` 명령으로 연다(익스텐션은 셸을 모른다).
 *
 * 경로로 말한다 — 탭 id가 아니다. 미리보기 탭 provider가 `markdown-preview:///<path>`에서 경로를 꺼내 준다.
 */
export interface IMarkdownPreviewViewModel {
  /** 원문을 읽고 감시하기 시작한다 — 멱등. 탭 provider가 탭을 열 때 부른다. */
  openPreview(path: string): void;
  previewOf(path: string): PreviewState;
  /** 지금 활성 파일의 미리보기를 연다. 활성 파일이 `.md`가 아니면 아무 일도 없다. */
  openActivePreview(): void;
}
