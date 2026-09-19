import { URI } from "#contracts";
import type { ContextDescriptor, ICommandService } from "#core/commands";
import type { Registry } from "#core/registry";
import { makeAutoObservable, observableRef, runInAction } from "mobx";
import type { IMarkdownPreviewModel } from "../model/IMarkdownPreviewModel";
import type { IMarkdownPreviewViewModel, PreviewState } from "./IMarkdownPreviewViewModel";

const isMarkdown = (path: string): boolean => /\.(?:md|mdx|markdown)$/iu.test(path);

/** 지금 활성 탭이 마크다운 파일이면 그 경로, 아니면 `null` — `tab.active.uri` 문맥을 읽는다. */
const activeMarkdownPath = (contexts: Registry<ContextDescriptor>): string | null => {
  const uri = contexts.tryGet("tab.active.uri")?.value();
  return uri instanceof URI && uri.scheme === "file" && isMarkdown(uri.path) ? uri.path : null;
};

/** `IMarkdownPreviewViewModel`의 유일한 구현체. */
export class MarkdownPreviewViewModel implements IMarkdownPreviewViewModel {
  readonly #model: IMarkdownPreviewModel;
  private previewsState: IMarkdownPreviewModel["previews"];
  readonly #commands: ICommandService;

  /**
   * 만들 때 커맨드와 단축키(Ctrl+Shift+V)를 스스로 등록한다 — 조립부가 따로 부르지 않는다.
   * 셸을 모른다 — 활성 탭은 `tab.active.uri` 문맥으로 읽고, 탭은 `arka.workbench.open` 명령으로 연다.
   */
  constructor({
    previewModel,
    commandCenterRegistry,
  }: {
    previewModel: IMarkdownPreviewModel;
    commandCenterRegistry: ICommandService;
  }) {
    this.#model = previewModel;
    this.#commands = commandCenterRegistry;
    this.previewsState = previewModel.previews;
    makeAutoObservable<this, "previewsState">(
      this,
      {
        previewsState: observableRef,
      },
      { autoBind: true },
    );
    previewModel.onDidChange(() => runInAction(() => (this.previewsState = previewModel.previews)));

    commandCenterRegistry.actions.add({
      id: "markdown.openPreview",
      label: "마크다운 미리보기 열기",
      execute: () => this.openActivePreview(),
    });
    commandCenterRegistry.keybindings.add({
      keybinding: "ctrl+shift+v",
      actionId: "markdown.openPreview",
      when: (contexts) => activeMarkdownPath(contexts) !== null,
    });
  }

  /** `#model.open`에 위임한다 — 이미 열려 있으면 아무 일도 없다. */
  openPreview(path: string): void {
    this.#model.open(path);
  }

  /** 아직 없는 경로면 `loading` 상태를 돌려준다 — 화면이 빈 값을 다루지 않아도 된다. */
  previewOf(path: string): PreviewState {
    const preview = this.previewsState[path];
    if (preview === undefined) return { loading: true, markdown: "", truncated: false, failure: null };
    return {
      loading: preview.status === "loading",
      markdown: preview.markdown,
      truncated: preview.truncated,
      failure: preview.failure,
    };
  }

  /** 활성 탭이 마크다운 파일이 아니면 아무 일도 안 한다. */
  openActivePreview(): void {
    const path = activeMarkdownPath(this.#commands.contexts);
    if (path === null) return;
    this.#commands.execute("arka.workbench.open", { uri: URI.parse(`markdown-preview:///${path}`) });
  }
}
