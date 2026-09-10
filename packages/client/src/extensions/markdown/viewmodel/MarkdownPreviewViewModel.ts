import type { ICommandCenterRegistry } from '#core/commands';
import { ViewModelBase } from '#core/viewmodel';
import { atom } from 'nanostores';
import type { IMarkdownPreviewModel } from '../model/IMarkdownPreviewModel';
import { PREVIEW_TAB_KIND, pathOfPreviewTab, previewTabIdOf, type IMarkdownPreviewViewModel, type PreviewState } from './IMarkdownPreviewViewModel';

const isMarkdown = (path: string): boolean => /\.(?:md|mdx|markdown)$/iu.test(path);

/** `IMarkdownPreviewViewModel`의 유일한 구현체. */
export class MarkdownPreviewViewModel extends ViewModelBase implements IMarkdownPreviewViewModel {
  readonly #model: IMarkdownPreviewModel;
  readonly #previews;
  readonly #activeFile: () => string | null;
  readonly #openTab: (tab: { id: string; kind: string; title: string }) => void;

  /** 만들 때 커맨드와 단축키(Ctrl+Shift+V)를 스스로 등록한다 — 조립부가 따로 부르지 않는다. */
  constructor({
    previewModel,
    commandCenterRegistry,
    activeFile,
    openTab,
  }: {
    previewModel: IMarkdownPreviewModel;
    commandCenterRegistry: ICommandCenterRegistry;
    /** 지금 활성 탭이 파일이면 그 경로, 아니면 `null` — 조립부가 셸에서 읽어 준다. */
    activeFile: () => string | null;
    openTab: (tab: { id: string; kind: string; title: string }) => void;
  }) {
    super();
    this.#model = previewModel;
    this.#activeFile = activeFile;
    this.#openTab = openTab;
    this.#previews = this.observe(atom(previewModel.previews));
    previewModel.onDidChange(() => this.#previews.set(previewModel.previews));

    commandCenterRegistry.registerCommand({ id: 'markdown.openPreview', label: '마크다운 미리보기 열기', execute: () => this.openActivePreview() });
    commandCenterRegistry.registerKeybinding({ id: 'markdown.openPreview.keybinding', keybinding: 'ctrl+shift+v', actionId: 'markdown.openPreview' });
  }

  /** 미리보기 탭이 아니면 아무 일도 안 한다. 탭이 그려질 때 불린다. */
  openPreview(tabId: string): void {
    const path = pathOfPreviewTab(tabId);
    if (path !== null) this.#model.open(path);
  }

  /** 아직 없는 탭이면 `loading` 상태를 돌려준다 — 화면이 빈 값을 다루지 않아도 된다. */
  previewOf(tabId: string): PreviewState {
    const path = pathOfPreviewTab(tabId);
    const preview = path === null ? undefined : this.#previews.get()[path];
    if (preview === undefined) return { loading: true, markdown: '', truncated: false, failure: null };
    return { loading: preview.status === 'loading', markdown: preview.markdown, truncated: preview.truncated, failure: preview.failure };
  }

  /** 활성 탭이 마크다운 파일이 아니면 아무 일도 안 한다. */
  openActivePreview(): void {
    const path = this.#activeFile();
    if (path === null || !isMarkdown(path)) return;
    const name = path.split('/').pop() ?? path;
    this.#openTab({ id: previewTabIdOf(path), kind: PREVIEW_TAB_KIND, title: `미리보기 ${name}` });
  }
}
